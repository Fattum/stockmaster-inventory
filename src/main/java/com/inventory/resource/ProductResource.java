package com.inventory.resource;

import com.inventory.dto.ProductDTO;
import com.inventory.entity.Category;
import com.inventory.entity.Product;
import com.inventory.service.CategoryService;
import com.inventory.service.ProductService;

import jakarta.ejb.EJB;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@Path("/products")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class ProductResource {

    @EJB
    private ProductService productService;

    @EJB
    private CategoryService categoryService;

    @POST
    public Response createProduct(@Valid ProductDTO dto) {
        Product product = convertToEntity(dto);
        Product created = productService.createProduct(product);
        return Response.created(URI.create("/api/products/" + created.getId()))
                .entity(convertToDTO(created))
                .build();
    }

    @GET
    @Path("/{id}")
    public Response getProduct(@PathParam("id") Long id) {
        return Response.ok(convertToDTO(productService.findById(id))).build();
    }

    @GET
    public Response getAllProducts() {
        List<ProductDTO> dtos = productService.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    @PUT
    @Path("/{id}")
    public Response updateProduct(@PathParam("id") Long id, @Valid ProductDTO dto) {
        Product product = convertToEntity(dto);
        Product updated = productService.updateProduct(id, product);
        return Response.ok(convertToDTO(updated)).build();
    }

    @DELETE
    @Path("/{id}")
    public Response deleteProduct(@PathParam("id") Long id) {
        productService.deleteProduct(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/search")
    public Response searchProducts(@QueryParam("name") String name) {
        List<ProductDTO> dtos = productService.searchProducts(name).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return Response.ok(dtos).build();
    }

    private Product convertToEntity(ProductDTO dto) {
        Product product = new Product();
        product.setId(dto.getId());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setQuantity(dto.getQuantity());
        product.setBarcode(dto.getBarcode());

        if (dto.getCategoryId() != null) {
            Category category = categoryService.findById(dto.getCategoryId());
            product.setCategory(category);
        }

        return product;
    }

    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setQuantity(product.getQuantity());
        dto.setBarcode(product.getBarcode());

        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }

        return dto;
    }
}
