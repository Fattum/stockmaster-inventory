package com.inventory.service;

import com.inventory.entity.Category;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import java.util.List;

@Stateless
public class CategoryService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    public Category createCategory(@Valid Category category) {
        if (findByName(category.getName()) != null) {
            throw new BusinessException("Cette catégorie existe déjà");
        }
        em.persist(category);
        return category;
    }

    public Category findById(Long id) {
        Category category = em.find(Category.class, id);
        if (category == null) {
            throw new ResourceNotFoundException("Catégorie non trouvée avec ID: " + id);
        }
        return category;
    }

    public List<Category> findAll() {
        return em.createQuery("SELECT c FROM Category c ORDER BY c.name", Category.class)
                .getResultList();
    }

    private Category findByName(String name) {
        try {
            return em.createQuery("SELECT c FROM Category c WHERE LOWER(c.name) = LOWER(:name)", Category.class)
                    .setParameter("name", name)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }
}
