package com.inventory.service;

import com.inventory.entity.Customer;
import com.inventory.exception.ResourceNotFoundException;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import java.util.List;

@Stateless
public class CustomerService {

    @PersistenceContext(unitName = "inventoryPU")
    private EntityManager em;

    public Customer createCustomer(@Valid Customer customer) {
        em.persist(customer);
        return customer;
    }

    public Customer updateCustomer(Long id, @Valid Customer customerDetails) {
        Customer customer = findById(id);

        customer.setName(customerDetails.getName());
        customer.setEmail(customerDetails.getEmail());
        customer.setPhone(customerDetails.getPhone());
        customer.setAddress(customerDetails.getAddress());

        return em.merge(customer);
    }

    public void deleteCustomer(Long id) {
        Customer customer = findById(id);
        em.remove(customer);
    }

    public Customer findById(Long id) {
        Customer customer = em.find(Customer.class, id);
        if (customer == null) {
            throw new ResourceNotFoundException("Client non trouvé avec ID: " + id);
        }
        return customer;
    }

    public List<Customer> findAll() {
        return em.createQuery("SELECT c FROM Customer c", Customer.class).getResultList();
    }

    public List<Customer> searchCustomers(String keyword) {
        return em.createQuery(
                "SELECT c FROM Customer c WHERE LOWER(c.name) LIKE :keyword", Customer.class)
                .setParameter("keyword", "%" + keyword.toLowerCase() + "%")
                .getResultList();
    }
}
