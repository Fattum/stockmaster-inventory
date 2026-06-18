package com.inventory.resource;

import com.inventory.dto.CustomerDTO;
import com.inventory.entity.Customer;
import com.inventory.service.CustomerService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@Path("/customers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class CustomerResource {

    @EJB
    private CustomerService customerService;

    @POST
    public Response createCustomer(@Valid CustomerDTO dto) {
        Customer customer = convertToEntity(dto);
        Customer created = customerService.createCustomer(customer);
        return Response.created(URI.create("/api/customers/" + created.getId()))
                .entity(convertToDTO(created))
                .build();
    }

    @GET
    @Path("/{id}")
    public Response getCustomer(@PathParam("id") Long id) {
        return Response.ok(convertToDTO(customerService.findById(id))).build();
    }

    @GET
    public Response getAllCustomers() {
        List<CustomerDTO> dtos = customerService.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @PUT
    @Path("/{id}")
    public Response updateCustomer(@PathParam("id") Long id, @Valid CustomerDTO dto) {
        Customer customer = convertToEntity(dto);
        Customer updated = customerService.updateCustomer(id, customer);
        return Response.ok(convertToDTO(updated)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteCustomer(@PathParam("id") Long id) {
        customerService.deleteCustomer(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/search")
    public Response searchCustomers(@QueryParam("name") String name) {
        List<CustomerDTO> dtos = customerService.searchCustomers(name).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    private Customer convertToEntity(CustomerDTO dto) {
        Customer customer = new Customer();
        customer.setId(dto.getId());
        customer.setName(dto.getName());
        customer.setEmail(dto.getEmail());
        customer.setPhone(dto.getPhone());
        customer.setAddress(dto.getAddress());
        return customer;
    }

    private CustomerDTO convertToDTO(Customer customer) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(customer.getId());
        dto.setName(customer.getName());
        dto.setEmail(customer.getEmail());
        dto.setPhone(customer.getPhone());
        dto.setAddress(customer.getAddress());
        dto.setCreatedAt(customer.getCreatedAt());
        return dto;
    }
}
