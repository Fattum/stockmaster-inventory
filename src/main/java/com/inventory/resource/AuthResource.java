package com.inventory.resource;

import com.inventory.dto.LoginDTO;
import com.inventory.entity.User;
import com.inventory.service.AuditLogService;
import com.inventory.service.AuthService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @EJB
    private AuthService authService;

    @EJB
    private AuditLogService auditLogService;

    @POST
    @Path("/login")
    public Response login(@Valid LoginDTO loginDTO) {
        try {
            User user = authService.login(loginDTO);
            auditLogService.log("LOGIN_SUCCESS", user.getUsername(), null);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Connexion réussie");
            response.put("user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "fullName", user.getFullName(),
                    "role", user.getRole().toString(),
                    "email", user.getEmail()
            ));

            String basicAuth = "Basic " + Base64.getEncoder().encodeToString(
                    (loginDTO.getUsername() + ":" + loginDTO.getPassword()).getBytes());
            response.put("token", basicAuth);

            return Response.ok(response).build();
        } catch (Exception e) {
            auditLogService.log("LOGIN_FAILED", loginDTO.getUsername(), e.getMessage());
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("success", false, "message", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/logout")
    public Response logout() {
        authService.logout(null);
        return Response.ok(Map.of("success", true, "message", "Déconnexion réussie")).build();
    }
}
