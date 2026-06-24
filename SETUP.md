# Guide d'installation manuelle — StockMaster (WildFly + PostgreSQL)

Ce guide explique comment configurer **manuellement** l'environnement (base de données PostgreSQL + serveur WildFly) pour faire tourner le projet en local, après avoir cloné le dépôt GitHub. Aucune étape ici n'est automatisée : tout se fait à la main, une seule fois par poste.

## 0. Prérequis à installer

| Outil | Version | Lien |
|---|---|---|
| JDK | 17 | https://adoptium.net/ |
| Maven | 3.9+ | https://maven.apache.org/download.cgi |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |
| WildFly | 37.0.1.Final | https://www.wildfly.org/downloads/ |
| Git | — | https://git-scm.com/ |

Vérifier les installations :
```bash
java -version      # doit afficher 17.x
mvn -version
psql --version
```

## 1. Cloner le projet

```bash
git clone <URL_DU_REPO_GITHUB>
cd stockmaster-inventory
```

## 2. Créer la base PostgreSQL

Lancer `psql` en tant que superutilisateur (`postgres`) et exécuter :

```bash
psql -U postgres -c "CREATE DATABASE inventory_db;"
psql -U postgres -c "CREATE USER inventory_user WITH PASSWORD 'password123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;"
```

> Sous Windows, si `psql` n'est pas reconnu, utiliser le chemin complet, ex. `"C:\Program Files\PostgreSQL\16\bin\psql.exe"`, ou ajouter ce dossier au `PATH`.

## 3. Exécuter les scripts SQL (schéma + données)

Depuis la racine du projet :

```bash
psql -U inventory_user -d inventory_db -f database/01_schema_seed.sql
psql -U inventory_user -d inventory_db -f database/03_audit_log.sql
```

Ces deux scripts créent toutes les tables (`categories`, `products`, `customers`, `users`, `invoices`, `invoice_items`, `audit_logs`), les contraintes, les index, et insèrent les comptes de démo :

| Utilisateur | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `employee1` | `employee123` | EMPLOYEE |
| `manager` | `employee123` | EMPLOYEE |

`database/02_cleanup.sql` permet de tout supprimer si besoin de repartir de zéro :
```bash
psql -U inventory_user -d inventory_db -f database/02_cleanup.sql
```

## 4. Installer et démarrer WildFly

1. Télécharger et décompresser WildFly 37.0.1.Final (ex. dans `C:\wildfly\wildfly-37.0.1.Final` ou `~/wildfly-37.0.1.Final`).
2. Démarrer le serveur :
   - **Linux/Mac** : `./bin/standalone.sh`
   - **Windows** : `bin\standalone.bat`
3. Vérifier qu'il tourne : http://localhost:8080 doit afficher la page d'accueil WildFly.

Laisser ce terminal ouvert (le serveur tourne en avant-plan), ou le lancer en arrière-plan si besoin.

## 5. Installer le driver JDBC PostgreSQL comme module WildFly

Le driver ne doit **pas** être embarqué dans le `.war` (il est en scope `provided` dans le `pom.xml`) — il doit être installé comme module du serveur.

1. Récupérer le jar du driver (il est déjà dans le cache Maven local après un premier `mvn package`, ou à télécharger directement) :
   - Cache Maven : `~/.m2/repository/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar`
2. Créer le dossier du module dans l'installation WildFly :
   ```
   <WILDFLY_HOME>/modules/system/layers/base/org/postgresql/main/
   ```
3. Copier `postgresql-42.7.4.jar` dans ce dossier.
4. Créer dans ce même dossier un fichier `module.xml` avec ce contenu exact :

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
        <!-- Indispensable sur WildFly 37 / JDK 17 : sans elle, NoClassDefFoundError
             java.lang.management.ManagementFactory à la première connexion. -->
        <module name="java.management"/>
    </dependencies>
</module>
```

5. **Redémarrer complètement WildFly** (arrêter le process puis relancer `standalone.sh`/`standalone.bat` — un simple reload ne suffit pas, le chargeur de modules met en cache la résolution).

## 6. Créer le datasource WildFly

Avec WildFly démarré, ouvrir un **second terminal** et lancer la CLI :

- **Linux/Mac** : `<WILDFLY_HOME>/bin/jboss-cli.sh --connect`
- **Windows** : `<WILDFLY_HOME>\bin\jboss-cli.bat --connect`

Puis exécuter ces deux commandes (une par une) :

```
/subsystem=datasources/jdbc-driver=postgresql:add(driver-name=postgresql,driver-module-name=org.postgresql,driver-class-name=org.postgresql.Driver)
```

```
data-source add --name=InventoryPostgresDS --jndi-name=java:/InventoryPostgresDS --driver-name=postgresql --connection-url=jdbc:postgresql://localhost:5432/inventory_db --user-name=inventory_user --password=password123 --enabled=true --jta=true --use-ccm=true
```

Vérifier que la connexion fonctionne :
```
/subsystem=datasources/data-source=InventoryPostgresDS:test-connection-in-pool
```
→ doit renvoyer `"outcome" => "success"` avec `[true]`.

> ⚠️ Ne jamais réutiliser/écraser un datasource existant (ex. `PostgresDS`) sans vérifier à quoi il sert — il peut appartenir à un autre projet sur la même machine. Utiliser bien le nom `InventoryPostgresDS`, qui correspond à ce qui est attendu dans `src/main/resources/META-INF/persistence.xml` (`jta-data-source = java:/InventoryPostgresDS`).

## 7. Builder le projet

Depuis la racine du projet :

```bash
mvn clean package -DskipTests
```

Le fichier `target/inventory.war` est généré.

## 8. Déployer l'application sur WildFly

Avec la CLI WildFly toujours connectée (`jboss-cli.sh --connect` / `jboss-cli.bat --connect`) :

```
deploy /chemin/absolu/vers/target/inventory.war --force
```

Exemple Windows :
```
deploy C:\Users\moi\stockmaster-inventory\target\inventory.war --force
```

`--force` permet de redéployer si une version précédente existe déjà.

Pour retirer l'application :
```
undeploy inventory.war
```

## 9. Tester l'application

- Interface web : http://localhost:8080/inventory/login.html
- Se connecter avec `admin` / `admin123` ou `employee1` / `employee123`

Vérification rapide de l'API en ligne de commande :
```bash
curl -X POST http://localhost:8080/inventory/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
→ doit renvoyer un JSON avec `"success":true`.

## 10. Commandes utiles (résumé)

| Action | Commande |
|---|---|
| Builder | `mvn clean package -DskipTests` |
| Démarrer WildFly | `bin/standalone.sh` (ou `.bat`) |
| Se connecter à la CLI | `bin/jboss-cli.sh --connect` (ou `.bat`) |
| Déployer/redéployer | `deploy <chemin>/inventory.war --force` |
| Retirer le déploiement | `undeploy inventory.war` |
| Tester le datasource | `/subsystem=datasources/data-source=InventoryPostgresDS:test-connection-in-pool` |
| Réinitialiser la base | `psql -U inventory_user -d inventory_db -f database/02_cleanup.sql` puis rejouer l'étape 3 |

## 11. Problèmes fréquents

- **`NoClassDefFoundError: java.lang.management.ManagementFactory`** → la dépendance `java.management` manque dans le `module.xml` du driver PostgreSQL (étape 5). Après correction, **redémarrer tout le process WildFly**, pas juste `:reload`.
- **`401 Unauthorized` même sur `/auth/login`** → vérifier que le `.war` déployé est bien la dernière version buildée (`mvn clean package` avant chaque redeploy).
- **Connexion PostgreSQL refusée** → vérifier que le service PostgreSQL tourne (`pg_isready` ou via les services Windows) et que le port `5432` est bien celui utilisé dans l'URL du datasource.
- **Le datasource existe déjà / conflit de nom** → si un `PostgresDS` existe déjà sur la machine pour un autre projet, ne pas le toucher : utiliser un autre nom (`InventoryPostgresDS` comme indiqué, ou un autre nom cohérent avec `persistence.xml`).
- **Page blanche / 404 sur `/inventory/...`** → vérifier dans les logs WildFly (`standalone/log/server.log`) que le déploiement s'est bien terminé sans erreur (`WFLYSRV0010: Deployed "inventory.war"`).
