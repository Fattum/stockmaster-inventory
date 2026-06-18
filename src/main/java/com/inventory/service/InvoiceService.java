package com.inventory.service;

import com.inventory.entity.Customer;
import com.inventory.entity.Invoice;
import com.inventory.entity.InvoiceItem;
import com.inventory.entity.Product;
import com.inventory.exception.ResourceNotFoundException;

import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.util.List;

@Stateless
public class InvoiceService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    @EJB
    private CustomerService customerService;

    @EJB
    private ProductService productService;

    /**
     * requestedItems : InvoiceItem partiels (product.id + quantity uniquement) construits par la resource
     * à partir de la requête. unitPrice/subtotal sont recalculés ici à partir du prix courant du produit
     * (jamais fait confiance au prix envoyé par le client).
     */
    public Invoice createInvoice(Long customerId, List<InvoiceItem> requestedItems) {
        Customer customer = customerService.findById(customerId);

        Invoice invoice = new Invoice();
        invoice.setCustomer(customer);
        invoice.setInvoiceNumber(generateInvoiceNumber());

        BigDecimal total = BigDecimal.ZERO;

        for (InvoiceItem requested : requestedItems) {
            Product product = productService.findById(requested.getProduct().getId());
            productService.decreaseStock(product, requested.getQuantity());

            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(requested.getQuantity()));

            InvoiceItem item = new InvoiceItem();
            item.setInvoice(invoice);
            item.setProduct(product);
            item.setQuantity(requested.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setSubtotal(subtotal);

            invoice.getItems().add(item);
            total = total.add(subtotal);
        }

        invoice.setTotalAmount(total);
        em.persist(invoice);
        return invoice;
    }

    public Invoice findById(Long id) {
        Invoice invoice = em.find(Invoice.class, id);
        if (invoice == null) {
            throw new ResourceNotFoundException("Facture non trouvée avec ID: " + id);
        }
        return invoice;
    }

    public List<Invoice> findAll() {
        return em.createQuery("SELECT i FROM Invoice i ORDER BY i.invoiceDate DESC", Invoice.class)
                .getResultList();
    }

    private String generateInvoiceNumber() {
        long count = em.createQuery("SELECT COUNT(i) FROM Invoice i", Long.class).getSingleResult();
        return String.format("INV-%06d", count + 1);
    }
}
