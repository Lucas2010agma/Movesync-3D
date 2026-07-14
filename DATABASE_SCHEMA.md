# Esquema de la Base de Datos - MoveSync 3D

Este documento describe la arquitectura de base de datos NoSQL/JSON y relacional compatible diseñada para el sincronizador colaborativo en tiempo real de **MoveSync 3D**.

---

## 1. Estructura NoSQL (Estructura de Firestore / JSON)

En una base de datos documental como Firebase Firestore, toda la información está agrupada jerárquicamente o mediante referencias planas optimizadas para lecturas rápidas y sincronización reactiva.

### Colección: `households` (Unidades Domésticas)
Cada documento dentro de esta colección representa un domicilio en mudanza e indexa a sus miembros, estancias, inventario de cajas y tareas.

```json
{
  "code": "MS-384912",
  "name": "Apartamento Barcelona 2026",
  "passwordHash": "clave_segura_123",
  "members": [
    {
      "email": "lucas.agma.22@gmail.com",
      "name": "Lucas Agma",
      "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=lucas.agma.22@gmail.com",
      "role": "Owner"
    },
    {
      "email": "colaborador@movesync.com",
      "name": "Sofía Pérez",
      "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=colaborador@movesync.com",
      "role": "Editor"
    }
  ],
  "rooms": [
    {
      "id": "room-kitchen-1",
      "name": "Cocina",
      "template": "cocina",
      "x": 2,
      "y": 1
    }
  ],
  "boxes": [
    {
      "id": "box-1718293",
      "name": "Caja Utensilios Cocina",
      "status": "embalado",
      "fragility": "medio",
      "contents": ["Sartenes", "Platos de cerámica", "Cuchillos de cocina"],
      "assignedRoomId": "room-kitchen-1",
      "dimensions": {
        "width": 40,
        "height": 30,
        "depth": 30,
        "label": "mediano"
      },
      "color": "#b45309",
      "tapeType": "fragil"
    }
  ],
  "tasks": [
    {
      "id": "task-829381",
      "title": "Embalar cristalería de la cocina",
      "description": "Utilizar plástico de burbujas en las copas de vino antes de meterlas en la Caja de Utensilios.",
      "status": "por_hacer",
      "assignedEmail": "colaborador@movesync.com",
      "linkedBoxId": "box-1718293",
      "linkedRoomId": "room-kitchen-1",
      "dueDate": "2026-07-16"
    }
  ]
}
```

---

## 2. Equivalencia en Base de Datos Relacional (PostgreSQL / Supabase)

Si se implementa en un modelo relacional de SQL, las relaciones se normalizan mediante llaves foráneas (`FOREIGN KEY`) y tablas puente.

```sql
-- 1. Tabla de Usuarios
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    avatar TEXT
);

-- 2. Tabla de Hogares (Unidades Domésticas)
CREATE TABLE households (
    code VARCHAR(10) PRIMARY KEY, -- Ej. 'MS-123456'
    name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

-- 3. Tabla Intermedia de Colaboradores (Roles RBAC)
CREATE TYPE user_role AS ENUM ('Owner', 'Editor', 'Viewer');

CREATE TABLE household_members (
    household_code VARCHAR(10) REFERENCES households(code) ON DELETE CASCADE,
    user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
    role user_role DEFAULT 'Viewer',
    PRIMARY KEY (household_code, user_email)
);

-- 4. Tabla de Estancias (Rooms)
CREATE TYPE room_template AS ENUM ('cocina', 'dormitorio', 'baño', 'salon', 'jardin', 'estudio', 'otro');

CREATE TABLE rooms (
    id VARCHAR(50) PRIMARY KEY,
    household_code VARCHAR(10) REFERENCES households(code) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    template room_template DEFAULT 'otro',
    x INT NOT NULL, -- Grid position X (1-4)
    y INT NOT NULL  -- Grid position Y (1-4)
);

-- 5. Tabla de Cajas (Boxes)
CREATE TYPE box_status AS ENUM ('embalado', 'en_transito', 'desembalado');
CREATE TYPE fragility_level AS ENUM ('bajo', 'medio', 'alto');
CREATE TYPE tape_type AS ENUM ('regular', 'fragil', 'eco');

CREATE TABLE boxes (
    id VARCHAR(50) PRIMARY KEY,
    household_code VARCHAR(10) REFERENCES households(code) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    status box_status DEFAULT 'embalado',
    fragility fragility_level DEFAULT 'medio',
    contents TEXT[], -- Array de hilos de texto con artículos
    assigned_room_id VARCHAR(50) REFERENCES rooms(id) ON DELETE SET NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    depth INT NOT NULL,
    dim_label VARCHAR(30) DEFAULT 'mediano',
    color VARCHAR(7) DEFAULT '#d97706', -- Código Hexadecimal
    tape_type tape_type DEFAULT 'regular'
);

-- 6. Tabla de Tareas (Tasks)
CREATE TYPE task_status AS ENUM ('por_hacer', 'en_proceso', 'completado');

CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    household_code VARCHAR(10) REFERENCES households(code) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'por_hacer',
    assigned_email VARCHAR(255) REFERENCES users(email) ON DELETE SET NULL,
    linked_box_id VARCHAR(50) REFERENCES boxes(id) ON DELETE SET NULL,
    linked_room_id VARCHAR(50) REFERENCES rooms(id) ON DELETE SET NULL,
    due_date DATE
);
```

---

## 3. Lógica de Sincronización en Tiempo Real

1. **Protocolo:** Utiliza WebSockets en el endpoint `/ws` para mantener canales bidireccionales persistentes.
2. **Eventos:** Los clientes emiten mensajes como `add_box`, `update_box`, `delete_box`, que el servidor valida usando RBAC y luego retransmite de forma reactiva (`sync`) a todos los clientes asociados al mismo `householdCode`.
3. **Persistencia:** Servidor guarda los datos de forma atómica en un archivo plano JSON `households_db.json` lo que garantiza que los datos resistan reinicios de contenedores.
