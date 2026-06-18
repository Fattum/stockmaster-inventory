package com.inventory.service;

import com.inventory.dto.LoginDTO;
import com.inventory.entity.User;

import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;

@Stateless
public class AuthService {

    @EJB
    private UserService userService;

    public User login(LoginDTO loginDTO) {
        return userService.authenticate(loginDTO.getUsername(), loginDTO.getPassword());
    }

    public void logout(String token) {
        // Pas de session côté serveur (Basic Auth) : rien à invalider ici.
        // À implémenter si remplacement par un mécanisme JWT/session (cf. spec.md §9).
    }
}
