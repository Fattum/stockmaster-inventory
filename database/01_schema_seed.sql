-- =====================================================
-- BASE DE DONNÉES POUR SYSTÈME DE GESTION DE STOCK
-- Script fourni par le professeur, avec une correction :
-- les hash de mot de passe des comptes de démo ont été régénérés
-- (cf. note avant la table users ci-dessous).
-- =====================================================

-- Création de la base de données (à exécuter séparément si nécessaire)
-- CREATE DATABASE inventory_db;
-- CREATE USER inventory_user WITH PASSWORD 'password123';
-- GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;

-- =====================================================
-- 1. TABLE CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TABLE PRODUCTS
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    barcode VARCHAR(50) UNIQUE,
    category_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_product_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL
);

-- =====================================================
-- 3. TABLE CUSTOMERS
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. TABLE USERS (Pour l'authentification)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. TABLE INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    invoice_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id)
        REFERENCES customers(id) ON DELETE RESTRICT
);

-- =====================================================
-- 6. TABLE INVOICE_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE RESTRICT
);

-- =====================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON products(quantity);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_total ON invoices(total_amount);

CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_items_product ON invoice_items(product_id);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

INSERT INTO categories (name, description) VALUES
('Électronique', 'Produits électroniques, smartphones, ordinateurs et accessoires'),
('Vêtements', 'Vêtements pour hommes, femmes et enfants'),
('Livres', 'Livres, magazines et publications'),
('Maison & Jardin', 'Articles pour la maison et le jardin'),
('Sports & Loisirs', 'Équipements sportifs et de loisirs'),
('Alimentation', 'Produits alimentaires et boissons')
ON CONFLICT (name) DO NOTHING;

INSERT INTO customers (name, email, phone, address) VALUES
('Jean Dupont', 'jean.dupont@email.com', '0612345678', '12 rue de Paris, 75001 Paris'),
('Marie Martin', 'marie.martin@email.com', '0698765432', '45 avenue des Champs, 69002 Lyon'),
('Pierre Durand', 'pierre.durand@email.com', '0712345698', '78 boulevard Victor Hugo, 13001 Marseille'),
('Sophie Bernard', 'sophie.bernard@email.com', '0623456789', '23 rue Nationale, 59000 Lille'),
('Lucas Petit', 'lucas.petit@email.com', '0734567890', '56 cours de la République, 33000 Bordeaux')
ON CONFLICT (email) DO NOTHING;

-- Insertion des utilisateurs
-- NOTE IMPORTANTE : dans le script original du professeur, les 3 comptes de démo
-- (admin/employee1/manager) avaient EXACTEMENT le même hash stocké, qui s'avère être
-- sha256("password") — une valeur d'exemple de manuel, pas un vrai hash de "admin123"/
-- "employee123". Ces comptes ne pouvaient donc jamais se connecter avec les mots de
-- passe annoncés dans les commentaires.
-- Les hash ci-dessous ont été regénérés avec le vrai algorithme de l'application
-- (com.inventory.security.PasswordUtil, PBKDF2WithHmacSHA256, format
-- "iterations:saltBase64:hashBase64") pour que les mots de passe documentés fonctionnent
-- réellement après exécution de ce script.
INSERT INTO users (username, email, password, full_name, role, active) VALUES
('admin', 'admin@inventory.com',
 '65536:ov+D1yjSU9Kk/g2cPRYfPw==:2Lmt8ay7ElZPNtFEeF6JE9cB3z2395LVFm/zBkEyO6s=',
 'Administrateur Principal', 'ADMIN', true),
('employee1', 'employee1@inventory.com',
 '65536:OZwjnB6C6PMkq8tYocu+Yw==:arahgvyq2sI5wNHCRPIw5kcf8gE6d8fAeAjZjd7OHNQ=',
 'Employé Standard', 'EMPLOYEE', true),
('manager', 'manager@inventory.com',
 '65536:OZwjnB6C6PMkq8tYocu+Yw==:arahgvyq2sI5wNHCRPIw5kcf8gE6d8fAeAjZjd7OHNQ=',
 'Gestionnaire Stock', 'EMPLOYEE', true)
ON CONFLICT (username) DO NOTHING;

INSERT INTO products (name, description, price, quantity, barcode, category_id) VALUES
-- Électronique
('iPhone 15 Pro', 'Smartphone Apple dernière génération', 1299.99, 50, 'APPIP15PRO-001', 1),
('MacBook Pro 14', 'Ordinateur portable Apple M3', 1999.99, 30, 'APP-MBP14-002', 1),
('Samsung Galaxy S24', 'Smartphone Samsung haut de gamme', 1099.99, 45, 'SAM-S24-003', 1),
('Casque Sony WH-1000XM5', 'Casque audio Bluetooth à réduction de bruit', 399.99, 100, 'SONY-WH1000-004', 1),
-- Vêtements
('T-shirt Nike Sport', 'T-shirt en coton respirant', 29.99, 200, 'NKE-TS-005', 2),
('Jean Levi''s 501', 'Jean classique coupe droite', 89.99, 150, 'LEV-J501-006', 2),
('Robe Zara Été', 'Robe légère pour l''été', 59.99, 80, 'ZAR-ROBE-007', 2),
-- Livres
('Le Petit Prince', 'Livre d''Antoine de Saint-Exupéry', 12.99, 300, 'LPP-001-008', 3),
('Harry Potter à l''école des sorciers', 'Tome 1 de J.K. Rowling', 19.99, 250, 'HPT1-009', 3),
('Clean Code', 'Robert C. Martin - Programmation', 45.99, 120, 'CC-ROBERT-010', 3),
-- Maison & Jardin
('Set de cuisine Tefal', 'Poêles et casseroles antiadhésives', 149.99, 60, 'TEFSET-011', 4),
('Plante verte artificielle', 'Décoration intérieure', 29.99, 180, 'DECOPLANT-012', 4),
('Lampadaire LED', 'Éclairage moderne pour salon', 79.99, 90, 'LAMP-LED-013', 4),
-- Sports & Loisirs
('Vélo de route Triban', 'Vélo pour cyclisme sur route', 499.99, 25, 'TRIVELO-014', 5),
('Ballon de football', 'Ballon taille 5 officiel', 24.99, 150, 'BALL-FOOT-015', 5),
-- Alimentation
('Café en grains Colombie', 'Café bio origine Colombie', 15.99, 200, 'CAFECOL-016', 6),
('Thé vert menthe', 'Sachets de thé à la menthe', 8.99, 300, 'THE-VERT-017', 6);

-- =====================================================
-- VÉRIFICATION DE L'INSTALLATION
-- =====================================================
DO $$
DECLARE
    table_count INTEGER;
    user_count INTEGER;
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO product_count FROM products;

    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Installation terminée avec succès !';
    RAISE NOTICE 'Tables créées: %', table_count;
    RAISE NOTICE 'Utilisateurs: %', user_count;
    RAISE NOTICE 'Produits: %', product_count;
    RAISE NOTICE 'Catégories: %', (SELECT COUNT(*) FROM categories);
    RAISE NOTICE 'Clients: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Comptes par défaut:';
    RAISE NOTICE '- Admin: admin / admin123';
    RAISE NOTICE '- Employé: employee1 / employee123';
    RAISE NOTICE '- Manager: manager / employee123';
    RAISE NOTICE '=========================================';
END $$;
