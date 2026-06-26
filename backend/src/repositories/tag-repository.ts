import { prisma } from '../utils/prisma';
import { Tag } from '@prisma/client';

export const TagRepository = {
  async findAll(): Promise<Tag[]> {
    return prisma.tag.findMany({ orderBy: { name: 'asc' } });
  },

  async findByName(name: string): Promise<Tag | null> {
    return prisma.tag.findUnique({ where: { name } });
  },

  async findManyByIds(ids: string[]): Promise<Tag[]> {
    return prisma.tag.findMany({ where: { id: { in: ids } } });
  },

  async create(name: string): Promise<Tag> {
    return prisma.tag.create({ data: { name } });
  },
};
