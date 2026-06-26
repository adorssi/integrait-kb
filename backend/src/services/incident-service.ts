import { IncidentRepository } from '../repositories/incident-repository';
import { ClientRepository } from '../repositories/client-repository';
import { TechnicianRepository } from '../repositories/technician-repository';
import { EquipmentRepository } from '../repositories/equipment-repository';
import { ICreateIncidentDTO, IUpdateIncidentDTO, ICreateSolutionDTO, IIncidentFilters, IncidentStatus } from '../models/types';
import { AppError } from '../middlewares/error-handler';

// Transiciones de estado permitidas
const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.OPEN]: [IncidentStatus.IN_PROGRESS],
  [IncidentStatus.IN_PROGRESS]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [],
};

export const IncidentService = {
  async list(filters: IIncidentFilters) {
    return IncidentRepository.findAll(filters);
  },

  async getById(id: string) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) throw new AppError(404, 'Incidente no encontrado');
    return incident;
  },

  async create(data: ICreateIncidentDTO) {
    const client = await ClientRepository.findById(data.clientId);
    if (!client || !client.active) throw new AppError(404, 'Cliente no encontrado');

    if (data.technicianId) {
      const tech = await TechnicianRepository.findById(data.technicianId);
      if (!tech || !tech.active) throw new AppError(404, 'Técnico no encontrado');
    }

    if (data.equipmentId) {
      const equipment = await EquipmentRepository.findById(data.equipmentId);
      if (!equipment || equipment.clientId !== data.clientId) {
        throw new AppError(400, 'El equipo no pertenece al cliente indicado');
      }
    }

    return IncidentRepository.create(data);
  },

  /**
   * Solo se pueden editar incidentes en estado OPEN.
   * No permite cambiar cliente ni estado desde este endpoint.
   */
  async update(id: string, data: IUpdateIncidentDTO) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) throw new AppError(404, 'Incidente no encontrado');
    if (incident.status !== IncidentStatus.OPEN) {
      throw new AppError(400, 'Solo se pueden editar incidentes en estado OPEN');
    }
    return IncidentRepository.update(id, data);
  },

  async changeStatus(id: string, newStatus: IncidentStatus) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) throw new AppError(404, 'Incidente no encontrado');

    const currentStatus = incident.status as IncidentStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed.includes(newStatus)) {
      throw new AppError(400, `No se puede cambiar de ${currentStatus} a ${newStatus}`);
    }

    if (newStatus === IncidentStatus.RESOLVED && !incident.solution) {
      throw new AppError(400, 'Debe registrar una solución antes de resolver el incidente');
    }

    return IncidentRepository.updateStatus(id, newStatus);
  },

  async assignTechnician(id: string, technicianId: string | null) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) throw new AppError(404, 'Incidente no encontrado');

    if (technicianId) {
      const tech = await TechnicianRepository.findById(technicianId);
      if (!tech || !tech.active) throw new AppError(404, 'Técnico no encontrado');
    }

    return IncidentRepository.assignTechnician(id, technicianId);
  },

  /**
   * Registra la solución y automáticamente cambia el estado a RESOLVED.
   * Un incidente solo puede tener una solución (unicidad garantizada en schema).
   */
  async registerSolution(id: string, data: ICreateSolutionDTO) {
    const incident = await IncidentRepository.findById(id);
    if (!incident) throw new AppError(404, 'Incidente no encontrado');

    if (incident.status === IncidentStatus.RESOLVED) {
      throw new AppError(400, 'El incidente ya está resuelto');
    }
    if (incident.solution) {
      throw new AppError(400, 'El incidente ya tiene una solución registrada');
    }

    await IncidentRepository.createSolution(id, data.description, data.timeSpentMinutes);
    return IncidentRepository.updateStatus(id, IncidentStatus.RESOLVED);
  },
};
