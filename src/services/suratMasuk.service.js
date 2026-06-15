const prisma = require("../config/db");
const {
  PENDING_STATUS_VALUES,
  VERIFIED_STATUS_VALUES,
} = require("../utils/documentStatus");

const SORTABLE_FIELDS = ["createdAt", "title", "documentDate", "status"];

const getAll = async ({ search, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", status, userId, role }) => {
  const skip = (page - 1) * limit;
  const safeSortBy = SORTABLE_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const where = {
    type: "masuk",
    ...(search && {
      title: {
        contains: search,
      },
    }),
    ...(status && status !== "all" && { status }),
    ...(role && role.toLowerCase() !== "admin" && userId && {
      OR: [
        { createdBy: userId },
        { approverIds: { contains: `"${String(userId)}"` } },
      ],
    }),
  };

  const [data, total, pending, verified] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: {
        [safeSortBy]: safeSortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
    prisma.document.count({
      where: {
        ...where,
        status: {
          in: PENDING_STATUS_VALUES,
        },
      },
    }),
    prisma.document.count({
      where: {
        ...where,
        status: {
          in: VERIFIED_STATUS_VALUES,
        },
      },
    }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats: {
      total,
      pending,
      verified,
    },
  };
};

const getById = async (id) => {
  return prisma.document.findUnique({
    where: {
      id: Number(id),
    },
  });
};

const create = async (data) => {
  let approverIds = (data.approverIds || []).map(String);
  if (approverIds.length === 0) {
    const staffUsers = await prisma.user.findMany({
      where: { role: 'staff' },
      select: { id: true }
    });
    approverIds = staffUsers.map(u => String(u.id));
  }

  return prisma.document.create({
    data: {
      title: data.title,
      sender: data.sender ?? null,
      documentDate: data.documentDate ?? null,
      filePath: data.filePath,
      fileId: data.fileId ?? null,
      storageType: data.storageType ?? "local",
      type: "masuk",
      status: "pending",
      createdBy: data.createdBy,
      approverIds: JSON.stringify(approverIds),
      approvedByIds: JSON.stringify([]),
    },
  });
};

const update = async (id, data) => {
  return prisma.document.update({
    where: { id: Number(id) },
    data,
  });
};

const remove = async (id) => {
  return prisma.document.delete({
    where: { id: Number(id) },
  });
};

module.exports = {
  getAll,
  create,
  getById,
  update,
  remove,
};
