package com.inventory.service;

import com.inventory.entity.Product;
import com.inventory.exception.BusinessException;
import com.inventory.exception.ResourceNotFoundException;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import java.util.List;

@Stateless
public class ProductService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    public Product createProduct(@Valid Product product) {
        if (product.getBarcode() != null && !product.getBarcode().isEmpty()
                && findByBarcode(product.getBarcode()) != null) {
            throw new BusinessException("Ce code-barres est déjà utilisé");
        }
        em.persist(product);
        return product;
    }

    public Product updateProduct(Long id, @Valid Product productDetails) {
        Product product = findById(id);

        product.setName(productDetails.getName());
        product.setDescription(productDetails.getDescription());
        product.setPrice(productDetails.getPrice());
        product.setQuantity(productDetails.getQuantity());
        product.setBarcode(productDetails.getBarcode());
        product.setCategory(productDetails.getCategory());

        return em.merge(product);
    }

    public void deleteProduct(Long id) {
        Product product = findById(id);
        em.remove(product);
    }

    public Product findById(Long id) {
        Product product = em.find(Product.class, id);
        if (product == null) {
            throw new ResourceNotFoundException("Produit non trouvé avec ID: " + id);
        }
        return product;
    }

    public List<Product> findAll() {
        return em.createQuery("SELECT p FROM Product p", Product.class).getResultList();
    }

    public List<Product> searchProducts(String keyword) {
        // LEFT JOIN explicite : un simple "p.category.name" génère un inner join implicite
        // et exclurait à tort les produits sans catégorie de toute recherche (même par nom/barcode).
        String pattern = "%" + keyword.toLowerCase() + "%";
        return em.createQuery(
                "SELECT p FROM Product p LEFT JOIN p.category c WHERE " +
                        "LOWER(p.name) LIKE :keyword OR " +
                        "LOWER(p.barcode) LIKE :keyword OR " +
                        "LOWER(c.name) LIKE :keyword", Product.class)
                .setParameter("keyword", pattern)
                .getResultList();
    }

    public Product findByBarcode(String barcode) {
        try {
            return em.createQuery("SELECT p FROM Product p WHERE p.barcode = :barcode", Product.class)
                    .setParameter("barcode", barcode)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    public void decreaseStock(Product product, int quantity) {
        if (product.getQuantity() < quantity) {
            throw new BusinessException("Stock insuffisant pour le produit: " + product.getName());
        }
        product.setQuantity(product.getQuantity() - quantity);
        em.merge(product);
    }
}
