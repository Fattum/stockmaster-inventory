package com.inventory.security;

import com.inventory.entity.Role;
import com.inventory.entity.User;
import com.inventory.service.UserService;

import jakarta.annotation.Priority;
import jakarta.ejb.EJB;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.util.Base64;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class SecurityFilter implements ContainerRequestFilter, ContainerResponseFilter {

    @EJB
    private UserService userService;

    private static final ThreadLocal<User> currentUser = new ThreadLocal<>();

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        if (path.startsWith("/")) {
            path = path.substring(1);
        }

        if (path.startsWith("auth/login") || path.startsWith("auth/logout")) {
            return;
        }

        String authHeader = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Basic ")) {
            requestContext.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("Authentification requise")
                            .build());
            return;
        }

        String base64Credentials = authHeader.substring("Basic ".length());
        String credentials = new String(Base64.getDecoder().decode(base64Credentials));
        String[] parts = credentials.split(":", 2);

        if (parts.length != 2) {
            requestContext.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("Authentification invalide")
                            .build());
            return;
        }

        try {
            User user = userService.authenticate(parts[0], parts[1]);
            currentUser.set(user);

            if (!hasPermission(user, path)) {
                requestContext.abortWith(
                        Response.status(Response.Status.FORBIDDEN)
                                .entity("Accès non autorisé")
                                .build());
            }
        } catch (Exception e) {
            requestContext.abortWith(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("Authentification invalide")
                            .build());
        }
    }

    private boolean hasPermission(User user, String path) {
        if (user.getRole() == Role.ADMIN) {
            return true;
        }

        if (user.getRole() == Role.EMPLOYEE) {
            if (path.contains("users")) {
                return false;
            }
            return path.contains("products") || path.contains("customers")
                    || path.contains("invoices") || path.contains("categories");
        }

        return false;
    }

    public static User getCurrentUser() {
        return currentUser.get();
    }

    @Override
    public void filter(ContainerRequestContext requestContext, ContainerResponseContext responseContext) {
        // Le pool de threads du serveur réutilise les threads entre requêtes :
        // sans ce nettoyage, le ThreadLocal pourrait exposer l'utilisateur d'une requête précédente.
        currentUser.remove();
    }
}
