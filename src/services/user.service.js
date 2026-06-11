const prisma = require("../config/db");
const bcrypt = require("bcrypt");

const getAll = async (search = "") => {
  const where = search ? {
    OR: [
      { name: { contains: search } },
      { email: { contains: search } }
    ]
  } : {};

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { documents: true }
      }
    }
  });
};

const VALID_ROLES = ["admin", "staff"];

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const create = async (data) => {
  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    throw new Error("Name must be at least 2 characters.");
  }
  if (data.name.length > 100) {
    throw new Error("Name must not exceed 100 characters.");
  }
  if (!data.email || !validateEmail(data.email)) {
    throw new Error("Valid email is required.");
  }
  if (!data.password || data.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (data.role && !VALID_ROLES.includes(data.role.toLowerCase())) {
    throw new Error(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);

  return prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: hashedPassword,
      role: data.role ? data.role.toLowerCase() : "staff"
    }
  });
};

const update = async (id, data) => {
  const updateData = { ...data };

  // hash new password if provided
  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(updateData.password, salt);
  }

  return prisma.user.update({
    where: { id: Number(id) },
    data: updateData
  });
};

const remove = async (id) => {
  return prisma.user.delete({
    where: { id: Number(id) }
  });
};

const getById = async (id) => {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      _count: {
        select: { documents: true }
      }
    }
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
