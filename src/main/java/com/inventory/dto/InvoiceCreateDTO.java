package com.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class InvoiceCreateDTO {

    @NotNull(message = "Le client est obligatoire")
    private Long customerId;

    @NotEmpty(message = "La facture doit contenir au moins une ligne")
    @Valid
    private List<InvoiceItemRequestDTO> items;

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public List<InvoiceItemRequestDTO> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItemRequestDTO> items) {
        this.items = items;
    }
}
