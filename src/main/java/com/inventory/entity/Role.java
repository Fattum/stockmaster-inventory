package com.inventory.entity;

public enum Role {
    ADMIN("Administrateur"),
    EMPLOYEE("Employé");

    private final String displayName;

    Role(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
