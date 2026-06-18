package com.inventory.resource;

import com.inventory.dto.UserDTO;
import com.inventory.entity.Role;
import com.inventory.entity.User;
import com.inventory.security.SecurityFilter;
import com.inventory.service.AuditLogService;
import com.inventory.service.UserService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class UserResource {

    @EJB
    private UserService userService;

    @EJB
    private AuditLogService auditLogService;

    private String actorUsername() {
        User actor = SecurityFilter.getCurrentUser();
        return actor != null ? actor.getUsername() : "system";
    }

    @POST
    public Response createUser(@Valid UserDTO userDTO) {
        User currentUser = SecurityFilter.getCurrentUser();
        if (currentUser == null || currentUser.getRole() != Role.ADMIN) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        User user = convertToEntity(userDTO);
        User created = userService.createUser(user);
        auditLogService.log("USER_CREATED", created.getUsername(), "Créé par " + actorUsername());
        return Response.created(URI.create("/api/users/" + created.getId()))
                .entity(convertToDTO(created))
                .build();
    }

    @GET
    @Path("/{id}")
    public Response getUser(@PathParam("id") Long id) {
        User user = userService.findById(id);
        return Response.ok(convertToDTO(user)).build();
    }

    @GET
    public Response getAllUsers() {
        List<UserDTO> dtos = userService.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @PUT
    @Path("/{id}")
    public Response updateUser(@PathParam("id") Long id, @Valid UserDTO userDTO) {
        User user = convertToEntity(userDTO);
        User updated = userService.updateUser(id, user);
        auditLogService.log("USER_UPDATED", updated.getUsername(), "Modifié par " + actorUsername());
        return Response.ok(convertToDTO(updated)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteUser(@PathParam("id") Long id) {
        User deactivated = userService.deleteUser(id);
        auditLogService.log("USER_DEACTIVATED", deactivated.getUsername(), "Désactivé par " + actorUsername());
        return Response.noContent().build();
    }

    @GET
    @Path("/search")
    public Response searchUsers(@QueryParam("keyword") String keyword) {
        List<UserDTO> dtos = userService.searchUsers(keyword).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @PATCH
    @Path("/{id}/toggle")
    public Response toggleUserStatus(@PathParam("id") Long id) {
        User toggled = userService.toggleUserStatus(id);
        String statusLabel = toggled.getActive() ? "activé" : "désactivé";
        auditLogService.log("USER_TOGGLED", toggled.getUsername(), "Compte " + statusLabel + " par " + actorUsername());
        return Response.ok().build();
    }

    private User convertToEntity(UserDTO dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setPassword(dto.getPassword());
        user.setFullName(dto.getFullName());
        user.setRole(dto.getRole());
        if (dto.getActive() != null) {
            user.setActive(dto.getActive());
        }
        return user;
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setActive(user.getActive());
        return dto;
    }
}
