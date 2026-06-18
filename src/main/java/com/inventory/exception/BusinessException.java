package com.inventory.exception;

import jakarta.ejb.ApplicationException;

// Sans @ApplicationException, le conteneur EJB enveloppe toute RuntimeException levée depuis un
// @Stateless dans une jakarta.ejb.EJBException avant qu'elle n'atteigne la couche JAX-RS : le
// BusinessExceptionMapper ne la reconnaîtrait alors jamais et le client recevrait un 500 générique
// au lieu du 400 attendu.
@ApplicationException(rollback = true)
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }
}
