package com.inventory.resource;

import com.inventory.dto.AuditLogDTO;
import com.inventory.entity.AuditLog;
import com.inventory.entity.Role;
import com.inventory.entity.User;
import com.inventory.security.SecurityFilter;
import com.inventory.service.AuditLogService;

import jakarta.ejb.EJB;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.stream.Collectors;

@Path("/audit-logs")
@Produces(MediaType.APPLICATION_JSON)
public class AuditLogResource {

    @EJB
    private AuditLogService auditLogService;

    @GET
    public Response getRecent(@QueryParam("limit") Integer limit) {
        User currentUser = SecurityFilter.getCurrentUser();
        if (currentUser == null || currentUser.getRole() != Role.ADMIN) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        int effectiveLimit = (limit != null && limit > 0 && limit <= 200) ? limit : 20;

        List<AuditLogDTO> dtos = auditLogService.findRecent(effectiveLimit).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    private AuditLogDTO convertToDTO(AuditLog log) {
        AuditLogDTO dto = new AuditLogDTO();
        dto.setId(log.getId());
        dto.setAction(log.getAction());
        dto.setUsername(log.getUsername());
        dto.setDetails(log.getDetails());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }
}
