# Spec — Inventory Management App (StockMaster)

Spécification technique de l'application de gestion de stock, basée sur l'implémentation Jakarta EE (backend) + HTML/CSS/JS vanilla (frontend) fournie. Ce document sert de référence pour (re)construire le projet dans `inventory-full-app/`.

## 1. Aperçu

Application web de gestion de stock avec :
- Authentification (Basic Auth) et gestion des rôles (`ADMIN`, `EMPLOYEE`)
- Gestion des produits, catégories, clients et factures
- Gestion des utilisateurs (réservée aux admins)
- Frontend SPA légère (sans framework) consommant une API REST JAX-RS

## 2. Stack technique

- **Backend** : Java EE / Jakarta EE — EJB (`@Stateless`), JPA (`EntityManager`), JAX-RS (`@Path`, `ContainerRequestFilter`), Bean Validation (`javax.validation`)
- **Persistence** : JPA via `persistence.xml`, unité de persistance `inventoryPU`
- **Frontend** : HTML5, CSS3 (custom, variables CSS), JavaScript vanilla (fetch API), Font Awesome 6 (CDN)
- **Build** : Maven (`pom.xml`), packaging `war`
- **Auth** : HTTP Basic Auth (header `Authorization: Basic base64(username:password)`), pas de JWT en l'état (mentionné comme amélioration future)

## 3. Structure du projet

```
inventory-full-app/
├── pom.xml
├── src/main/java/com/inventory/
│   ├── entity/      User, Role, Product, Category, Customer, Invoice, InvoiceItem
│   ├── dto/         LoginDTO, UserDTO
│   ├── service/      UserService, AuthService, ProductService, CustomerService, InvoiceService
│   ├── resource/     AuthResource, UserResource, ProductResource, CustomerResource, InvoiceResource
│   ├── security/     SecurityFilter, PasswordUtil
│   └── config/       ApplicationConfig
├── src/main/webapp/
│   ├── index.html, login.html
│   ├── css/style.css
│   ├── js/ app.js, auth.js, products.js, customers.js, invoices.js, users.js
│   └── WEB-INF/web.xml
└── src/main/resources/META-INF/persistence.xml
```

> Note : seuls `User`, `Role`, les DTOs/services/resources/sécurité associés, et les modules frontend `app.js`/`auth.js`/`products.js`/`customers.js` (partiel) sont détaillés intégralement dans la source fournie. `Product`, `Category`, `Customer`, `Invoice`, `InvoiceItem` (entités), `ProductService`/`CustomerService`/`InvoiceService`, `ProductResource`/`CustomerResource`/`InvoiceResource`, `ApplicationConfig`, `web.xml`, `persistence.xml`, `invoices.js` et `users.js` ne sont pas fournis en détail — leur comportement est déduit du contexte (appels API observés dans `app.js`/`products.js`/`customers.js`) et doit être complété lors de l'implémentation.

## 4. Modèle de données

### 4.1 User
| Champ | Type | Contraintes |
|---|---|---|
| id | Long | PK, auto |
| username | String | unique, NotBlank, 3-50 car. |
| email | String | unique, NotBlank, format email |
| password | String | NotBlank, min 6 car. (stocké hashé) |
| fullName | String | NotBlank |
| role | Role (enum) | NotNull |
| active | Boolean | défaut `true` |
| createdAt | LocalDateTime | défini au `@PrePersist` |
| lastLogin | LocalDateTime | mis à jour à chaque login réussi |

### 4.2 Role (enum)
- `ADMIN` ("Administrateur")
- `EMPLOYEE` ("Employé")

### 4.3 Product / Category / Customer / Invoice / InvoiceItem
Déduits des usages frontend :
- **Product** : `id`, `name`, `description`, `price`, `quantity`, `barcode`, `categoryId`, `categoryName`
- **Category** : `id`, `name`
- **Customer** : `id`, `name`, `email`, `phone`, `address`, `createdAt`
- **Invoice** : `id`, `invoiceNumber`, `customer` (ref Customer), `invoiceDate`, `totalAmount`, items (liste `InvoiceItem`)
- **InvoiceItem** : ligne de facture liée à `Invoice` et `Product` (quantité, prix unitaire, sous-total) — à préciser à l'implémentation

## 5. Sécurité

### 5.1 Authentification
- Endpoint `POST /api/auth/login` — body `LoginDTO {username, password}`
  - Succès → `200` avec `{success, message, user: {id, username, fullName, role, email}, token}` où `token` = `"Basic " + base64(username:password)`
  - Échec → `401` avec `{success:false, message}`
- Endpoint `POST /api/auth/logout` — no-op côté serveur (pas d'invalidation de session, commenté comme amélioration future avec JWT)

### 5.2 Filtre de sécurité (`SecurityFilter`)
- `@Provider`, priorité `AUTHENTICATION`, appliqué à toutes les requêtes sauf `auth/login` et `auth/logout`
- Exige un header `Authorization: Basic <credentials>`, sinon `401`
- Décode les credentials, ré-authentifie via `UserService.authenticate(...)` à chaque requête (pas de session côté serveur)
- Stocke l'utilisateur courant dans un `ThreadLocal<User>` (exposé via `SecurityFilter.getCurrentUser()`)
- Autorisation par rôle :
  - `ADMIN` → accès total
  - `EMPLOYEE` → accès à `products`, `customers`, `invoices` ; **refusé** sur `users` (`403`)

### 5.3 Mots de passe (`PasswordUtil`)
- Hash : SHA-256 + salt aléatoire 16 bytes (`SecureRandom`), stocké sous forme `base64(salt):base64(hash)`
- Vérification : recalcul du hash avec le salt extrait, comparaison `MessageDigest.isEqual`

> Remarque sécurité : SHA-256 simple salé n'est pas un algorithme de hachage de mot de passe recommandé pour la production (préférer BCrypt/Argon2/PBKDF2 avec itérations). À signaler si ce spec doit guider une implémentation en production.

## 6. Règles métier — Utilisateurs (`UserService`)

- **Création** : rejette si `username` ou `email` déjà utilisé (`BusinessException`) ; hash du mot de passe avant persistance ; `active = true` par défaut
- **Mise à jour** : remplace username/email/fullName/role ; mot de passe ré-haché seulement s'il est fourni (non vide)
- **Suppression** : soft-delete (`active = false`) — **bloquée si c'est le dernier admin actif** (`BusinessException`)
- **Activation/Désactivation** (`toggleUserStatus`) : bascule `active` — **bloquée si c'est le dernier admin actif** et qu'on tenterait de le désactiver
- **Recherche** (`searchUsers`) : `LIKE` insensible à la casse sur `username`, `email`, `fullName`
- **Authentification** (`authenticate`) : vérifie existence, mot de passe, statut actif ; met à jour `lastLogin`
- Seuls les utilisateurs `active = true` sont retournés par `findById`/`findAll`/`findByUsername`/`findByEmail`

## 7. API REST

### 7.1 Auth (`/api/auth`)
| Méthode | Path | Description | Accès |
|---|---|---|---|
| POST | /login | Authentifie, renvoie user + token Basic | Public |
| POST | /logout | No-op | Public |

### 7.2 Users (`/api/users`)
| Méthode | Path | Description | Accès |
|---|---|---|---|
| POST | / | Créer un utilisateur | ADMIN uniquement (vérifié dans la resource ET bloqué par `SecurityFilter` pour EMPLOYEE) |
| GET | /{id} | Détail utilisateur | ADMIN |
| GET | / | Liste des utilisateurs actifs | ADMIN |
| PUT | /{id} | Mise à jour | ADMIN |
| DELETE | /{id} | Soft-delete | ADMIN |
| GET | /search?keyword= | Recherche | ADMIN |
| PATCH | /{id}/toggle | Active/désactive | ADMIN |

### 7.3 Products / Customers / Invoices (`/api/products`, `/api/customers`, `/api/invoices`)
Non fournis en détail, mais déduits des appels frontend — CRUD standard attendu :
- `GET /` (liste), `GET /{id}` (détail), `POST /` (création), `PUT /{id}` (mise à jour), `DELETE /{id}` (suppression)
- `GET /products/search?name=` — recherche produit par nom/catégorie/code-barres
- `GET /customers/search?name=` — recherche client par nom
- Accessibles à `ADMIN` et `EMPLOYEE`

## 8. Frontend

### 8.1 Pages
- `login.html` — formulaire de connexion, affiche les comptes démo (`admin/admin123`, `employee/employee123`)
- `index.html` — shell SPA : sidebar (navigation par `data-module`), top bar, zone de contenu dynamique (`#contentArea`), modal générique (`#modal`)

### 8.2 Modules JS
- `auth.js` : `checkAuth()` (garde de page, redirige vers login si pas de session ; masque `.admin-only` si non-admin), gestion du submit login, `authenticatedFetch()` (ajoute le header `Authorization`, redirige vers login sur `401`), logout (vide `localStorage`)
- `app.js` : routeur de modules (`loadModule`), navigation sidebar, `loadDashboard()` (stats agrégées : total produits/clients/factures/CA, 5 dernières factures), helpers `showModal`/`closeModal`/`showAlert`
- `products.js` : liste, recherche, création (formulaire avec catégories), édition, suppression (confirm avant DELETE)
- `customers.js` : liste, recherche, création, édition (suppression tronquée dans la source fournie mais suit le même schéma que products.js)
- `invoices.js`, `users.js` : non fournis en détail — `users.js` doit répliquer le pattern CRUD de `products.js`/`customers.js` pour `/api/users`, réservé à l'admin (cohérent avec `nav-item.admin-only` dans `index.html`)

### 8.3 État / session
- Stocké dans `localStorage` : `currentUser` (JSON), `authToken` (`"Basic ..."`)
- Pas de gestion de session serveur — chaque requête ré-authentifie via Basic Auth

### 8.4 UI
- `style.css` : variables CSS (couleurs primaire/danger/succès/warning), layout sidebar fixe + main content, cartes de stats dashboard, tables de données, modals, formulaires, alertes (`alert-success`/`alert-error`), responsive (sidebar réduite à 70px sous 768px)

## 9. Points ouverts / à compléter

- Détail des entités `Product`, `Category`, `Customer`, `Invoice`, `InvoiceItem` (relations JPA, contraintes de validation)
- `ProductService`, `CustomerService`, `InvoiceService` (logique métier, ex. décrément de stock à la facturation)
- `ProductResource`, `CustomerResource`, `InvoiceResource` (endpoints JAX-RS)
- `ApplicationConfig` (classe `Application` JAX-RS, mapping `/api`)
- `web.xml` (mapping servlet, sécurité déclarative éventuelle)
- `persistence.xml` (datasource, dialecte JPA)
- `invoices.js`, `users.js` (logique frontend complète)
- Remplacement du hash SHA-256+salt par un algorithme dédié (BCrypt/Argon2) si déploiement en production
- Remplacement de l'auth Basic + ré-authentification par requête par un vrai mécanisme de session/JWT (mentionné comme TODO dans le code source)

## 10. Phases de développement

État actuel du dépôt local (`c:\Users\fatim\eclipse-workspace\inventory`) : squelette Maven vide (`pom.xml` minimal, `src/` sans fichiers). Aucun code de la spec n'est encore implémenté. Phasage proposé :

### Phase 0 — Setup projet ✅

Choix retenus : **WildFly** (serveur d'application) + **PostgreSQL** (base de données).

Réalisé (état initial — **voir Phase 1ter pour la version finale réellement déployée**, qui migre `javax.*`→`jakarta.*`, Java 1.8→17 et `java:/PostgresDS`→`java:/InventoryPostgresDS`) :
- `pom.xml` : packaging `war`, API Jakarta EE (scope `provided`, fournie par WildFly), driver `org.postgresql:postgresql:42.7.4` (scope `provided`, installé comme module WildFly plutôt qu'embarqué dans le WAR pour éviter les conflits de classloading avec le module géré par le serveur), `maven-compiler-plugin`, `maven-war-plugin`
- `src/main/resources/META-INF/persistence.xml` : unité `inventoryPU`, `transaction-type="JTA"`, dialecte `PostgreSQLDialect`
- `src/main/webapp/WEB-INF/web.xml` : `welcome-file` → `login.html`
- `src/main/java/com/inventory/config/ApplicationConfig.java` : `@ApplicationPath("/api")` pour exposer les ressources JAX-RS sous `/inventory/api/...`

**Schéma de base de données** : géré par un script SQL fourni (pas par Hibernate — `hibernate.hbm2ddl.auto=none`, cf. Phase 1bis). Le script est versionné dans [database/01_schema_seed.sql](../database/01_schema_seed.sql) (tables, contraintes, index, données de démo) et [database/02_cleanup.sql](../database/02_cleanup.sql) (DROP complet). Base : `inventory_db`, utilisateur applicatif : `inventory_user`/`password123`.

À faire manuellement (configuration serveur, hors dépôt) :
1. Créer la base et l'utilisateur PostgreSQL, puis exécuter le script :
   ```
   psql -U postgres -c "CREATE DATABASE inventory_db;"
   psql -U postgres -c "CREATE USER inventory_user WITH PASSWORD 'password123';"
   psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;"
   psql -U inventory_user -d inventory_db -f database/01_schema_seed.sql
   ```
2. Créer le module driver PostgreSQL dans `modules/system/layers/base/org/postgresql/main/` : copier `postgresql-42.7.4.jar` (déjà en cache Maven local après un `mvn package`) à côté d'un `module.xml` :
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <module xmlns="urn:jboss:module:1.9" name="org.postgresql">
       <resources>
           <resource-root path="postgresql-42.7.4.jar"/>
       </resources>
       <dependencies>
           <module name="jakarta.transaction.api"/>
           <module name="java.sql"/>
           <module name="java.sql.rowset"/>
           <!-- Indispensable sur WildFly 37/JDK 17 : sans elle, NoClassDefFoundError
                java.lang.management.ManagementFactory à la première connexion. -->
           <module name="java.management"/>
       </dependencies>
   </module>
   ```
3. Enregistrer le driver et créer le datasource via `jboss-cli.sh --connect` :
   ```
   /subsystem=datasources/jdbc-driver=postgresql:add(driver-name=postgresql,driver-module-name=org.postgresql,driver-class-name=org.postgresql.Driver)
   data-source add --name=InventoryPostgresDS --jndi-name=java:/InventoryPostgresDS \
     --driver-name=postgresql --connection-url=jdbc:postgresql://localhost:5432/inventory_db \
     --user-name=inventory_user --password=password123 --enabled=true --jta=true --use-ccm=true
   ```
   Nom `InventoryPostgresDS` délibérément distinct d'un éventuel `PostgresDS` déjà présent sur le serveur (cas rencontré : un autre exercice utilisait déjà ce nom pour une base différente — ne jamais réutiliser/écraser une datasource existante sans vérifier à quoi elle sert).
4. **Redémarrer complètement WildFly** (pas seulement `:reload`) après la création du module — le chargeur de modules JBoss met en cache la résolution (y compris en échec) d'un module pour la durée de vie du process, donc un simple reload ne suffit pas à reprendre en compte un `module.xml` modifié après le premier chargement.
5. Vérifier : `/subsystem=datasources/data-source=InventoryPostgresDS:test-connection-in-pool` doit renvoyer `[true]`.

### Phase 1 — Modèle de données & sécurité ✅
- Entités créées : `User`, `Role`, `Category`, `Product`, `Customer`, `Invoice`, `InvoiceItem` (relations JPA : `Product.category` → `Category`, `Invoice.customer` → `Customer`, `Invoice.items` → `InvoiceItem` en cascade `ALL`/`orphanRemoval`, `InvoiceItem.invoice`/`InvoiceItem.product`)
- `exception.BusinessException`, `exception.ResourceNotFoundException` (utilisées par `UserService`, référencées dans la spec d'origine mais absentes du code fourni)
- `security.PasswordUtil` : **mis à jour** par rapport à la source d'origine — `PBKDF2WithHmacSHA256` (65 536 itérations, clé 256 bits, sel 16 bytes, comparaison en temps constant) au lieu d'un simple SHA-256 salé, sans dépendance externe (disponible nativement dans `javax.crypto`)
- `security.SecurityFilter` : logique identique à la source (Basic Auth ré-authentifié à chaque requête, permissions par rôle), + ajout d'un `ContainerResponseFilter` qui vide le `ThreadLocal` en fin de requête (évite une fuite d'utilisateur entre requêtes sur un thread réutilisé par le pool du serveur)
- `service.UserService`, `service.AuthService` : logique identique à la source d'origine
- `dto.LoginDTO` créé en avance (requis par `AuthService`) ; `UserDTO` reste prévu en Phase 2

`mvn compile` passe sans erreur sur l'ensemble du module.

### Phase 1bis — Alignement sur le script SQL fourni par le professeur ✅

L'étudiant a fourni le script SQL officiel de la base (`database/01_schema_seed.sql`) après les Phases 1-4. Ce script est la référence du schéma (pas Hibernate) ; plusieurs écarts avec les entités JPA générées en Phase 1 ont été corrigés :

- `persistence.xml` : `hibernate.hbm2ddl.auto` passé de `update` à **`none`** (le schéma, les contraintes et les index sont entièrement gérés par le script SQL, pas par Hibernate) ; ajout de `hibernate.physical_naming_strategy = CamelCaseToUnderscoresNamingStrategy` — sans ça, Hibernate aurait utilisé le nom de champ Java tel quel (`fullName`, `invoiceDate`, `totalAmount`...) comme nom de colonne, alors que le script utilise du snake_case (`full_name`, `invoice_date`, `total_amount`...) : sans cette stratégie, **rien n'aurait fonctionné** au premier insert/select.
- `InvoiceItem.unitPrice` : ajout d'un `@Column(name = "price")` explicite — le script nomme cette colonne `price`, pas `unit_price` (la stratégie de naming automatique ne pouvait pas deviner cette divergence de nom métier).
- `Product.price` / `ProductDTO.price` : validation resserrée de `@DecimalMin(0.0)` (acceptait 0) à `@Positive` (strictement positif), pour matcher la contrainte `CHECK (price > 0)` du script — sans ça, un prix à 0 aurait passé la validation Bean Validation côté Java puis échoué brutalement (`500`) sur la contrainte SQL.
- **Bug détecté dans le seed du script fourni** : les 3 comptes de démo (`admin`, `employee1`, `manager`) avaient tous exactement le même hash de mot de passe stocké, qui s'est avéré être `sha256("password")` — une valeur d'exemple de manuel, vérifiée par calcul, pas un vrai hash de `admin123`/`employee123`. Avec ce seed tel quel, **aucun des comptes de démo n'aurait pu se connecter**, quel que soit l'algorithme de vérification utilisé côté serveur. Les hash dans `database/01_schema_seed.sql` ont été régénérés avec le vrai `PasswordUtil.hashPassword(...)` de l'application (PBKDF2WithHmacSHA256), pour que les identifiants documentés (`admin/admin123`, `employee1/employee123`) fonctionnent réellement.
- `database/02_cleanup.sql` ajouté (script de suppression complète, fourni par le professeur, sauvegardé tel quel).
- Datasource WildFly (Phase 0) mis à jour pour utiliser `inventory_db`/`inventory_user`/`password123`, conformément au script fourni (au lieu des noms placeholder utilisés initialement).
- `login.html` : bloc « comptes démo » réintroduit (retiré en Phase 4 faute de seed fonctionnel — désormais pertinent).

`mvn compile` revérifié après ces changements (cf. fin de Phase 1bis ci-dessous).

### Phase 1ter — Déploiement réel sur WildFly 37 + débogage ✅

L'étudiant a démarré son WildFly local (déjà installé : **WildFly 37.0.1.Final**, JDK 17) et demandé un test réel. Plusieurs incompatibilités bloquantes ont été trouvées et corrigées, dans l'ordre où elles sont apparues :

1. **`javax.*` incompatible avec WildFly 37** — WildFly 37 implémente Jakarta EE 10/11 : les packages `javax.persistence`, `javax.ejb`, `javax.ws.rs`, `javax.validation`, `javax.annotation` n'existent plus du tout dans ses modules (seuls des alias dépréciés vers `jakarta.*` subsistent, qui n'exposent que les classes `jakarta.*`). Toute la Phase 1-4 avait été écrite en `javax.*` (Java EE 8), cohérent avec le `pom.xml` initial mais pas avec le serveur réellement installé. Migration complète :
   - Tous les fichiers Java : `javax.persistence/ejb/ws.rs/validation/annotation` → `jakarta.*` (par recherche-remplacement ciblée ; `javax.crypto` dans `PasswordUtil` n'a **pas** été touché — c'est une API du JDK, pas de Jakarta EE).
   - `pom.xml` : dépendance `javax:javaee-api:8.0.1` → `jakarta.platform:jakarta.jakartaee-api:10.0.0` ; `maven.compiler.source/target` 1.8 → 17 (Jakarta EE 10 exige Java 11+, alignement sur le JDK 17 du serveur cible).
   - `persistence.xml` : namespace/schema → `https://jakarta.ee/xml/ns/persistence`, `version="3.1"`.
   - `web.xml` : namespace/schema → `https://jakarta.ee/xml/ns/jakartaee`, `version="6.0"`.
2. **Datasource** : `PostgresDS` existait déjà sur ce WildFly, pointant vers une autre base (`mabd`, utilisateur `postgres`) — probablement un autre exercice de l'étudiant. Pour ne pas y toucher, une datasource séparée **`InventoryPostgresDS`** (`jndi-name=java:/InventoryPostgresDS`) a été créée, pointant vers `inventory_db`/`inventory_user`. `persistence.xml` mis à jour en conséquence (`jta-data-source`). Le module WildFly `org.postgresql` a dû déclarer une dépendance sur `java.management` (sinon `NoClassDefFoundError: java.lang.management.ManagementFactory` au moment d'ouvrir une connexion) — et un **redémarrage complet du process** WildFly a été nécessaire pour que le module rechargé soit pris en compte (`:reload` seul ne suffit pas : le chargeur de modules JBoss avait mis en cache l'échec de résolution du premier essai).
3. **`SecurityFilter` bloquait `/auth/login`** : `UriInfo.getPath()` renvoie un chemin commençant par `/` sur ce serveur (`/auth/login`), alors que le filtre testait `path.startsWith("auth/login")` (sans slash) — l'exclusion ne matchait jamais, donc le login lui-même exigeait une authentification. Correction : on retire le `/` de tête avant de comparer.
4. **`LazyInitializationException` (« no session »)** sur `GET /products` et `GET /invoices` : les associations `@ManyToOne(fetch = LAZY)` (`Product.category`, `Invoice.customer`, `InvoiceItem.product`) et la collection `Invoice.items` (LAZY par défaut) sont accédées dans les méthodes `convertToDTO` des *resources*, **après** la fin de la transaction EJB qui a chargé l'entité — le proxy Hibernate ne peut alors plus aller chercher la donnée. Passage de ces associations en `fetch = EAGER` (entités de référence/petites collections, coût négligeable ici).
5. **Les `BusinessException`/`ResourceNotFoundException` remontaient en `500` au lieu de `400`/`404`** dès qu'elles étaient levées depuis un `@Stateless` (ex. stock insuffisant lors de la création d'une facture) : le conteneur EJB enveloppe par défaut toute `RuntimeException` non annotée dans une `jakarta.ejb.EJBException` avant qu'elle n'atteigne la couche JAX-RS, ce qui empêche `BusinessExceptionMapper`/`ResourceNotFoundExceptionMapper` de la reconnaître. Correction : annotation `@jakarta.ejb.ApplicationException(rollback = true)` sur les deux classes, qui indique au conteneur de les laisser remonter inchangées (et de bien rollback la transaction — vérifié : le stock n'est pas décrémenté si la facture échoue en cours de traitement).

**Validé en conditions réelles** (déploiement effectif sur `http://localhost:8080/inventory`) :
- `POST /api/auth/login` (admin et employé) ✅
- `GET /api/products`, `/api/categories`, `/api/customers`, `/api/users` ✅
- `POST /api/invoices` multi-lignes : décrément de stock correct, `totalAmount`/`invoiceNumber` calculés ✅, rollback complet si une ligne échoue (stock insuffisant) ✅
- Permissions par rôle : employé refusé sur `/api/users` (`403`), autorisé sur `/api/products` (`200`) ✅
- Mappers d'exception : `400` (stock insuffisant, username dupliqué), `404` (produit introuvable) ✅
- Pages statiques (`login.html`, `index.html`, `js/app.js`) servies correctement ✅

### Phase 2 — API utilisateurs (référence du pattern CRUD) ✅
- `dto.UserDTO` créé (le mot de passe n'est jamais renvoyé dans les réponses : `convertToDTO` ne le copie jamais depuis l'entité)
- `resource.AuthResource` : `POST /api/auth/login`, `POST /api/auth/logout` — identique à la source d'origine (token = Basic Auth réémis en base64)
- `resource.UserResource` : CRUD complet (`POST /`, `GET /{id}`, `GET /`, `PUT /{id}`, `DELETE /{id}`, `GET /search`, `PATCH /{id}/toggle`) — identique à la source d'origine
- **Ajout** (non présent dans la source fournie) : `exception.BusinessExceptionMapper` (`@Provider ExceptionMapper`) → mappe `BusinessException` vers `400 Bad Request` JSON, `exception.ResourceNotFoundExceptionMapper` → `404 Not Found` JSON. Sans ces mappers, les exceptions levées par `UserService` (ex. username déjà pris, utilisateur introuvable) remonteraient en `500 Internal Server Error` génériques côté client. Ce pattern de mapper sera réutilisé tel quel pour les modules Produits/Clients/Factures (Phase 3) sans dupliquer de code

`mvn compile` passe sans erreur sur l'ensemble du module. L'API utilisateurs (`/api/auth/*`, `/api/users/*`) est fonctionnellement complète côté backend ; reste `users.js` (Phase 4) pour la consommer depuis le frontend.

### Phase 3 — API métier (Produits / Clients / Factures) ✅

DTOs créés : `CategoryDTO`, `ProductDTO` (avec `categoryId`/`categoryName` à plat pour le frontend), `CustomerDTO`, `InvoiceDTO`/`InvoiceItemDTO` (lecture), `InvoiceCreateDTO`/`InvoiceItemRequestDTO` (écriture — distincts car la création n'envoie que `productId`+`quantity`, jamais de prix).

- `service.ProductService` : CRUD + `searchProducts(keyword)` (nom/barcode/catégorie via `LEFT JOIN` explicite — un simple `p.category.name` génère un inner join implicite qui exclurait à tort tous les produits sans catégorie de la recherche), `decreaseStock(product, quantity)` (lève `BusinessException` si stock insuffisant), refus de barcode dupliqué
- `service.CustomerService` : CRUD + `searchCustomers(keyword)` par nom
- `service.InvoiceService.createInvoice(customerId, items)` : valide le client, pour chaque ligne récupère le produit, décrémente le stock (`ProductService.decreaseStock`), recalcule `unitPrice`/`subtotal` à partir du **prix courant en base** (jamais du prix envoyé par le client — évite la falsification de prix côté frontend), génère `invoiceNumber` au format `INV-NNNNNN` (séquentiel par comptage — limite connue : pas de garantie d'unicité sous forte concurrence, à remplacer par une séquence DB si le volume le justifie)
- **Ajout** (non listé dans la structure d'origine mais nécessaire) : `service.CategoryService`/`resource.CategoryResource` (`POST`/`GET /api/categories`) — sans cela, il n'existe aucun moyen de créer les catégories que le frontend propose dans le dropdown produit
- `resource.ProductResource`, `resource.CustomerResource` : CRUD + `GET /search?name=`
- `resource.InvoiceResource` : `POST /` (création multi-lignes), `GET /{id}`, `GET /` — pas de `PUT`/`DELETE` (une facture émise n'est pas modifiable/supprimable dans ce modèle ; à revoir si un besoin d'avoir/annulation apparaît)
- `SecurityFilter.hasPermission` mis à jour : `categories` ajouté à la liste des chemins accessibles aux `EMPLOYEE`

`mvn compile` passe sans erreur. Backend fonctionnellement complet pour Produits/Catégories/Clients/Factures.

### Phase 4 — Frontend ✅

Tous les fichiers de `src/main/webapp/` sont créés et le WAR se construit (`mvn package`) avec ces ressources packagées (vérifié via `unzip -l`). Tous les `.js` validés syntaxiquement (`node --check`).

- `auth.js` : **`API_BASE_URL` corrigé** par rapport à la source d'origine (`http://localhost:8080/inventory-api/api`, qui ne correspond à aucun artefact réel) → `window.location.origin + '/inventory/api'`, cohérent avec `<finalName>inventory</finalName>` du `pom.xml` et `@ApplicationPath("/api")`
- `app.js` : routeur de modules, dashboard (utilise directement `invoice.customerName`/`invoice.totalAmount` exposés par `InvoiceDTO`, plus besoin de croiser avec la liste clients comme dans la source d'origine), `showModal`/`closeModal`/`showAlert`
- **Ajout sécurité** (non présent dans la source fournie) : `escapeHtml()` dans `app.js`, utilisé par tous les modules avant d'injecter une donnée utilisateur (nom de produit/client/utilisateur, etc.) via `innerHTML`. Sans cela, un nom de produit contenant `<script>` serait stocké en base puis exécuté chez tout utilisateur consultant la liste (XSS stocké) — risque réel puisque ces noms sont des saisies libres.
- `products.js` : CRUD + recherche, **complété** par rapport à la source : dropdown de catégories alimenté par `GET /api/categories` (au lieu d'être déduit des produits existants, ce qui dans la source d'origine implique qu'aucune catégorie ne pourrait jamais être créée) + champ "nouvelle catégorie" qui appelle `POST /api/categories` à la volée
- `customers.js` : CRUD + recherche — **complété** (la source fournie était tronquée à partir de `deleteCustomer`)
- `invoices.js` (absent de la source fournie, écrit de zéro) : liste des factures, vue détaillée (lignes + total), création multi-lignes avec ajout/suppression dynamique de lignes, aperçu du total côté client (le total réel est toujours recalculé serveur-side, jamais transmis par le formulaire)
- `users.js` (absent de la source fournie, écrit de zéro, calqué sur `products.js`) : CRUD admin, badges rôle/statut, bouton de bascule actif/inactif (`PATCH /{id}/toggle`) désactivé sur son propre compte côté UI (le serveur protège déjà le dernier admin, ceci évite juste un aller-retour réseau inutile)
- `style.css` : classes ajoutées par rapport à la source — `.badge*` (rôle/statut), `.invoice-line*`/`.btn-add-line`/`.btn-remove-line` (formulaire facture), `.btn-view`, `.error-message`
- `login.html` : bloc "comptes démo" retiré (aucun utilisateur n'est encore seedé en base à ce stade — à réintroduire si un script de seed est ajouté)

Connu/limité : pas de seed de données (premier compte admin à créer manuellement, cf. Phase 5/6), aperçu du total facture côté client purement indicatif.

### Phase 4bis — Refonte visuelle Tailwind ✅

Relookage complet du frontend à partir d'une maquette Stitch (StockMaster — `DESIGN.md` + 7 écrans HTML/Tailwind), en conservant les vraies données et toute la logique métier existante. Choix explicite du périmètre (option « Relookage visuel d'abord ») : pas de nouvelles fonctionnalités backend pour les métriques décoratives de la maquette (statut de facture, taux de churn, logs d'accès, % de croissance) — ces éléments fictifs ont été omis ou remplacés par des indicateurs réels.

- `js/tailwind-config.js` (nouveau) : config Tailwind partagée (tokens couleur/typo/spacing du design system), chargée après le CDN Tailwind sur chaque page
- `css/style.css` : réduit à l'essentiel (police, icônes Material Symbols, dégradé login, scrollbar custom) — tout le reste passe par les classes utilitaires Tailwind
- `login.html`, `index.html` : reconstruits avec la mise en page de la maquette (sidebar fixe, topbar, cartes, modal avec backdrop-blur)
- `app.js`, `products.js`, `customers.js`, `invoices.js`, `users.js` : réécrits avec les classes Tailwind ; les indicateurs/stat-cards utilisent exclusivement des données réelles calculées côté client (ex. valeur de stock = `Σ price×quantity`, "nouveaux aujourd'hui" = `createdAt` du jour, santé du stock = % de produits au-dessus du seuil bas) — pas de placeholders du type "+12% vs mois dernier"
- Seuils d'alerte stock (`LOW_STOCK_THRESHOLD=20`, `CRITICAL_STOCK_THRESHOLD=5`) : purement côté client (aucune colonne "seuil" en base), utilisés pour les badges produits et le widget dashboard
- Petite addition non liée au visuel : support de `index.html?module=products` (deep-link vers un onglet), ajouté pour faciliter les tests automatisés de l'interface et accessoirement utile comme lien partageable
- Vérifié par capture d'écran headless (Edge `--headless=new`) sur login/dashboard/produits/clients/factures/utilisateurs, en plus des tests `curl` sur l'API

### Phase 5 — Durcissement / production
- Bootstrap : aucun utilisateur n'est seedé en base — créer le premier compte ADMIN manuellement (insertion SQL directe avec un mot de passe haché via `PasswordUtil.hashPassword`, ou endpoint d'amorçage temporaire à supprimer après usage) avant de pouvoir se connecter à l'application
- Remplacer Basic Auth par sessions ou JWT (éviter de transmettre le mot de passe en clair à chaque requête)
- Tests (unitaires services, intégration resources, tests frontend manuels par rôle ADMIN/EMPLOYEE)
- ~~Gestion des erreurs uniformisée~~ ✅ fait en Phase 2 (`BusinessExceptionMapper`/`ResourceNotFoundExceptionMapper`)
- Déploiement (build `war`, configuration BDD de prod, variables d'environnement/secrets)

### Phase 6 — Évolutions ✅

- **Pagination/tri** : entièrement côté client (`app.js` : `sortItems`, `sortableHeader`, `paginationControls`, `PAGE_SIZE=10`) sur les 4 listes (produits, clients, factures, utilisateurs). Chaque module garde un petit état `{page, pageSize, sortKey, sortDir, all}` ; les stat-cards restent calculées sur le jeu de données complet, seul le tableau est paginé/trié. Pas de pagination serveur — volumes de données trop faibles pour la justifier à ce stade.
- **Alertes de stock bas** : cloche de notification dans la topbar (`index.html` + `refreshNotifications()` dans `app.js`), avec badge de comptage et menu déroulant listant les produits sous le seuil. Rafraîchie au chargement, au clic sur "Rafraîchir", et après toute création/modification/suppression de produit ou de facture (le stock varie alors).
- **Export PDF de facture** : bouton "Télécharger PDF" dans la vue détail d'une facture (`invoices.js : downloadInvoicePdf`), génération **côté client** via `jsPDF` (CDN, `cdnjs.cloudflare.com/.../jspdf.umd.min.js`) à partir des données déjà chargées — pas de endpoint serveur dédié.
- **Audit log des actions admin** (nouveau module backend, additif — ne modifie aucune table du script professeur) :
  - Entité `AuditLog` / table `audit_logs` (migration `database/03_audit_log.sql`, appliquée manuellement comme les scripts précédents puisque `hibernate.hbm2ddl.auto=none`)
  - `AuditLogService` (écriture + lecture des N dernières entrées), `AuditLogResource` (`GET /api/audit-logs?limit=`, admin uniquement — bloqué pour EMPLOYEE par `SecurityFilter.hasPermission` comme `/users`)
  - Événements journalisés : `LOGIN_SUCCESS`/`LOGIN_FAILED` (`AuthResource`), `USER_CREATED`/`USER_UPDATED`/`USER_DEACTIVATED`/`USER_TOGGLED` (`UserResource`, avec l'acteur capturé via `SecurityFilter.getCurrentUser()`)
  - Affiché dans un panneau "Activité récente" sur la page Utilisateurs (`users.js : loadAuditLog`)

**Bug pré-existant corrigé en cours de route** (découvert en testant le toggle actif/inactif) : `UserService.findById()` filtre sur `active = true`, donc `toggleUserStatus()` qui l'utilisait ne pouvait jamais réactiver un compte déjà désactivé (404 systématique), et `findAll()` excluait les comptes inactifs de `GET /users` — ce qui rendait les comptes désactivés invisibles et irrécupérables depuis l'UI. Corrigé : `toggleUserStatus()` utilise désormais `em.find()` directement (sans filtre `active`), et `findAll()` retourne tous les utilisateurs (actifs et inactifs) puisque c'est précisément ce dont la page Utilisateurs a besoin pour permettre la réactivation.

Connu/limité : pas de pagination serveur (tri/pagination perdus si l'admin réinitialise PAGE_SIZE — actuellement fixé en dur) ; le PDF de facture est généré côté client donc n'est pas un document "officiel" signé serveur ; l'audit log ne journalise pas les actions sur produits/clients/factures (hors périmètre demandé : « actions admin »).
