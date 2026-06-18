package com.inventory.service;

import com.inventory.entity.Role;
import com.inventory.entity.User;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.security.PasswordUtil;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;

@Stateless
public class UserService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    public User createUser(@Valid User user) {
        if (findByUsername(user.getUsername()) != null) {
            throw new BusinessException("Le nom d'utilisateur existe déjà");
        }
        if (findByEmail(user.getEmail()) != null) {
            throw new BusinessException("L'email existe déjà");
        }

        user.setPassword(PasswordUtil.hashPassword(user.getPassword()));
        user.setActive(true);

        em.persist(user);
        return user;
    }

    public User updateUser(Long id, @Valid User userDetails) {
        User user = findById(id);

        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());
        user.setFullName(userDetails.getFullName());
        user.setRole(userDetails.getRole());

        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(PasswordUtil.hashPassword(userDetails.getPassword()));
        }

        return em.merge(user);
    }

    public User deleteUser(Long id) {
        User user = findById(id);

        if (user.getRole() == Role.ADMIN && countActiveAdmins() <= 1) {
            throw new BusinessException("Impossible de supprimer le dernier administrateur");
        }

        user.setActive(false);
        return em.merge(user);
    }

    public User findById(Long id) {
        User user = em.find(User.class, id);
        if (user == null || !user.getActive()) {
            throw new ResourceNotFoundException("Utilisateur non trouvé avec ID: " + id);
        }
        return user;
    }

    // Contrairement aux autres findAll() de l'appli, celui-ci inclut volontairement les comptes
    // désactivés : la page Utilisateurs doit pouvoir les afficher pour permettre leur réactivation.
    public List<User> findAll() {
        return em.createQuery("SELECT u FROM User u ORDER BY u.username", User.class)
                .getResultList();
    }

    public User findByUsername(String username) {
        try {
            return em.createQuery(
                    "SELECT u FROM User u WHERE u.username = :username AND u.active = true", User.class)
                    .setParameter("username", username)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    public User findByEmail(String email) {
        try {
            return em.createQuery(
                    "SELECT u FROM User u WHERE u.email = :email AND u.active = true", User.class)
                    .setParameter("email", email)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    public List<User> searchUsers(String keyword) {
        return em.createQuery(
                "SELECT u FROM User u WHERE u.active = true AND " +
                        "(LOWER(u.username) LIKE :keyword OR " +
                        "LOWER(u.email) LIKE :keyword OR " +
                        "LOWER(u.fullName) LIKE :keyword)", User.class)
                .setParameter("keyword", "%" + keyword.toLowerCase() + "%")
                .getResultList();
    }

    public User authenticate(String username, String password) {
        User user = findByUsername(username);

        if (user == null || !PasswordUtil.verifyPassword(password, user.getPassword())) {
            throw new BusinessException("Nom d'utilisateur ou mot de passe incorrect");
        }

        if (!user.getActive()) {
            throw new BusinessException("Ce compte est désactivé");
        }

        user.setLastLogin(LocalDateTime.now());
        em.merge(user);

        return user;
    }

    public User toggleUserStatus(Long id) {
        // Contrairement à findById(), on ne filtre pas sur "active" ici : le but explicite
        // de cette méthode est de pouvoir réactiver un utilisateur déjà désactivé.
        User user = em.find(User.class, id);
        if (user == null) {
            throw new ResourceNotFoundException("Utilisateur non trouvé avec ID: " + id);
        }

        if (user.getRole() == Role.ADMIN && user.getActive() && countActiveAdmins() <= 1) {
            throw new BusinessException("Impossible de désactiver le dernier administrateur");
        }

        user.setActive(!user.getActive());
        return em.merge(user);
    }

    private long countActiveAdmins() {
        return em.createQuery(
                "SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true", Long.class)
                .setParameter("role", Role.ADMIN)
                .getSingleResult();
    }
}
