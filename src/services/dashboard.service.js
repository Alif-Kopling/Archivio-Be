const prisma = require("../config/db");
const {
  PENDING_STATUS_VALUES,
  VERIFIED_STATUS_VALUES,
} = require("../utils/documentStatus");

const buildSearchWhere = (search) => {
  const value = typeof search === "string" ? search.trim() : "";

  if (!value) {
    return {};
  }

  return {
    OR: [
      {
        title: {
          contains: value,
        },
      },
      {
        sender: {
          contains: value,
        },
      },
    ],
  };
};

const getOverview = async ({ search, page = 1, limit = 10, userId, role }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const searchWhere = buildSearchWhere(search);

  const filterByApprover = role?.toLowerCase() !== 'admin' ? {
    AND: [
      {
        OR: [
          { approverIds: { contains: `"${userId}"` } },
          { approverIds: { contains: `[${userId},` } },
          { approverIds: { contains: `,${userId},` } },
          { approverIds: { contains: `,${userId}]` } },
          { approverIds: { contains: `[${userId}]` } },
        ]
      },
      {
        OR: [
          { approvedByIds: null },
          { approvedByIds: { not: { contains: `"${userId}"` } } },
        ]
      },
    ]
  } : {};

  // Define date range for growth (last 7 days)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  // Define date range for active staff (last 24 hours)
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);

  // Month boundaries for thisMonth trend
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // run queries in parallel to avoid multiple round trips
  const [counts, pendingTotal, data, growthData, activeUsers, leaderboardData, thisMonthCount, lastMonthCount] = await Promise.all([
    // group by status to get all counts at once
    prisma.document.groupBy({
      by: ['status'],
      where: filterByApprover,
      _count: {
        _all: true
      }
    }),
    // count pending docs for pagination
    prisma.document.count({
      where: {
        ...searchWhere,
        ...filterByApprover,
        status: { in: PENDING_STATUS_VALUES }
      },
    }),
    // fetch pending docs for the list
    prisma.document.findMany({
      where: {
        ...searchWhere,
        ...filterByApprover,
        status: { in: PENDING_STATUS_VALUES }
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: safeLimit,
      select: {
        id: true,
        title: true,
        filePath: true,
        status: true,
        createdAt: true,
        type: true,
        sender: true,
        documentDate: true,
        approverIds: true,
        approvedByIds: true,
      },
    }),
    // 4. Storage & Resource Growth (Document count by day)
    prisma.document.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: last7Days }
      },
      _count: { _all: true },
      orderBy: { createdAt: 'asc' }
    }),
    // 3. Active Staff Monitoring (Users with recent audit logs)
    prisma.auditLog.findMany({
      where: { createdAt: { gte: last24Hours } },
      distinct: ['userId'],
      select: {
        userId: true,
        createdAt: true,
      },
      take: 5
    }),
    // 6. Top Contributor & Leaderboard (Users with most document uploads)
    prisma.document.groupBy({
      by: ['createdBy'],
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    }),
    // 7. Documents created this month
    prisma.document.count({
      where: {
        createdAt: { gte: firstOfThisMonth },
        ...filterByApprover,
      },
    }),
    // 8. Documents created last month
    prisma.document.count({
      where: {
        createdAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
        ...filterByApprover,
      },
    }),
  ]);

  // Fetch full user details for active staff and leaderboard
  const [activeStaffDetails, leaderboardDetails] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: activeUsers.map(u => u.userId) } },
      select: { id: true, name: true, role: true }
    }),
    prisma.user.findMany({
      where: { id: { in: leaderboardData.map(l => l.createdBy) } },
      select: { id: true, name: true }
    })
  ]);

  // Map user details back
  const activeStaff = activeUsers.map(u => ({
    ...u,
    user: activeStaffDetails.find(d => d.id === u.userId)
  }));

  const leaderboard = leaderboardData.map(l => ({
    count: l._count._all,
    user: leaderboardDetails.find(d => d.id === l.createdBy)
  }));

  // Format growth data for charts (group by day)
  const growth = growthData.reduce((acc, curr) => {
    const day = curr.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + curr._count._all;
    return acc;
  }, {});

  const formattedGrowth = Object.entries(growth).map(([date, count]) => ({
    date,
    count
  }));

  // normalize groupBy results into simple counters
  let total = 0;
  let pending = 0;
  let verified = 0;

  counts.forEach(item => {
    const count = item._count._all;
    total += count;
    if (PENDING_STATUS_VALUES.includes(item.status)) {
      pending += count;
    } else if (VERIFIED_STATUS_VALUES.includes(item.status)) {
      verified += count;
    }
  });

  // calculate thisMonth trend vs last month
  const thisMonthTrend = lastMonthCount > 0
    ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
    : thisMonthCount > 0 ? 100 : 0;

  return {
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(pendingTotal / safeLimit),
    totalPending: pendingTotal,
    stats: {
      total,
      pending,
      verified,
      thisMonth: thisMonthCount,
      thisMonthTrend: Math.round(thisMonthTrend * 10) / 10,
    },
    monitoring: {
      activeStaff,
      storageGrowth: formattedGrowth,
      leaderboard
    }
  };
};

const getTrends = async () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const documents = await prisma.document.findMany({
    where: { createdAt: { gte: startOfYear } },
    select: { createdAt: true, type: true },
  });

  const monthMap = {};
  for (let i = 0; i < 12; i++) {
    const key = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
    monthMap[key] = { month: key, masuk: 0, keluar: 0, sertifikat: 0, total: 0 };
  }

  documents.forEach((doc) => {
    const key = `${doc.createdAt.getFullYear()}-${String(doc.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      monthMap[key][doc.type] += 1;
      monthMap[key].total += 1;
    }
  });

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
};

const bulkUpdateStatus = async (ids, status) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { count: 0 };
  }

  return prisma.document.updateMany({
    where: {
      id: {
        in: ids.map((id) => Number(id)),
      },
    },
    data: {
      status,
    },
  });
};

module.exports = {
  getOverview,
  getTrends,
  bulkUpdateStatus,
};
