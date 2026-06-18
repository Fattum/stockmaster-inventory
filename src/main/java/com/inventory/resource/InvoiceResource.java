package com.inventory.resource;

import com.inventory.dto.InvoiceCreateDTO;
import com.inventory.dto.InvoiceDTO;
import com.inventory.dto.InvoiceItemDTO;
import com.inventory.dto.InvoiceItemRequestDTO;
import com.inventory.entity.Invoice;
import com.inventory.entity.InvoiceItem;
import com.inventory.entity.Product;
import com.inventory.service.InvoiceService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@Path("/invoices")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class InvoiceResource {

    @EJB
    private InvoiceService invoiceService;

    @POST
    public Response createInvoice(@Valid InvoiceCreateDTO dto) {
        List<InvoiceItem> requestedItems = dto.getItems().stream()
                .map(this::toRequestedItem)
                .collect(Collectors.toList());

        Invoice created = invoiceService.createInvoice(dto.getCustomerId(), requestedItems);
        return Response.created(URI.create("/api/invoices/" + created.getId()))
                .entity(convertToDTO(created))
                .build();
    }

    @GET
    @Path("/{id}")
    public Response getInvoice(@PathParam("id") Long id) {
        return Response.ok(convertToDTO(invoiceService.findById(id))).build();
    }

    @GET
    public Response getAllInvoices() {
        List<InvoiceDTO> dtos = invoiceService.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    private InvoiceItem toRequestedItem(InvoiceItemRequestDTO itemDTO) {
        Product productRef = new Product();
        productRef.setId(itemDTO.getProductId());

        InvoiceItem item = new InvoiceItem();
        item.setProduct(productRef);
        item.setQuantity(itemDTO.getQuantity());
        return item;
    }

    private InvoiceDTO convertToDTO(Invoice invoice) {
        InvoiceDTO dto = new InvoiceDTO();
        dto.setId(invoice.getId());
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setCustomerId(invoice.getCustomer().getId());
        dto.setCustomerName(invoice.getCustomer().getName());
        dto.setInvoiceDate(invoice.getInvoiceDate());
        dto.setTotalAmount(invoice.getTotalAmount());
        dto.setItems(invoice.getItems().stream().map(this::convertItemToDTO).collect(Collectors.toList()));
        return dto;
    }

    private InvoiceItemDTO convertItemToDTO(InvoiceItem item) {
        InvoiceItemDTO dto = new InvoiceItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct().getId());
        dto.setProductName(item.getProduct().getName());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setSubtotal(item.getSubtotal());
        return dto;
    }
}
