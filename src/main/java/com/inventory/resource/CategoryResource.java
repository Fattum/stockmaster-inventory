package com.inventory.resource;

import com.inventory.dto.CategoryDTO;
import com.inventory.entity.Category;
import com.inventory.service.CategoryService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@Path("/categories")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class CategoryResource {

    @EJB
    private CategoryService categoryService;

    @POST
    public Response createCategory(@Valid CategoryDTO dto) {
        Category category = new Category(dto.getName());
        Category created = categoryService.createCategory(category);
        return Response.created(URI.create("/api/categories/" + created.getId()))
                .entity(convertToDTO(created))
                .build();
    }

    @GET
    public Response getAllCategories() {
        List<CategoryDTO> dtos = categoryService.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @GET
    @Path("/{id}")
    public Response getCategory(@PathParam("id") Long id) {
        return Response.ok(convertToDTO(categoryService.findById(id))).build();
    }

    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        return dto;
    }
}
