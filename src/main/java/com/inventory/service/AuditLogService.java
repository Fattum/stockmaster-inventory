package com.inventory.service;

import com.inventory.entity.AuditLog;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;

@Stateless
public class AuditLogService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    public void log(String action, String username, String details) {
        em.persist(new AuditLog(action, username, details));
    }

    public List<AuditLog> findRecent(int limit) {
        return em.createQuery(
                "SELECT a FROM AuditLog a ORDER BY a.createdAt DESC", AuditLog.class)
                .setMaxResults(limit)
                .getResultList();
    }
}
