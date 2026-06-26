import { CommentRepository } from '../repositories/comment-repository';
import { AppError } from '../middlewares/error-handler';

export const CommentService = {
  async list(incidentId: string) {
    return CommentRepository.findByIncident(incidentId);
  },

  async create(incidentId: string, content: string, technicianId: string) {
    return CommentRepository.create({ content, incidentId, technicianId });
  },

  async delete(id: string, requesterId: string, requesterRole: string) {
    const comment = await CommentRepository.findById(id);
    if (!comment) throw new AppError(404, 'Comentario no encontrado');
    // Solo el autor o un ADMIN puede eliminar
    if (comment.technicianId !== requesterId && requesterRole !== 'ADMIN') {
      throw new AppError(403, 'Sin permiso para eliminar este comentario');
    }
    return CommentRepository.delete(id);
  },
};
