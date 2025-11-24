import mysql from "mysql2";

// Clase base para operaciones CRUD genéricas
class BaseModel {
    constructor(conexion) {
        this.conexion = conexion;
    }

    // Método genérico para ejecutar consultas con promesas
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.conexion.query(sql, params, (error, resultado) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(resultado);
                }
            });
        });
    }

    // CRUD genérico - Crear
    async create(table, data) {
        const campos = Object.keys(data);
        const valores = Object.values(data);
        const placeholders = campos.map(() => '?').join(', ');
        
        const sql = `INSERT INTO ${table} (${campos.join(', ')}) VALUES (${placeholders})`;
        const resultado = await this.query(sql, valores);
        return resultado.insertId;
    }

    // CRUD genérico - Obtener todos
    async findAll(table, conditions = '', params = [], orderBy = '') {
        let sql = `SELECT * FROM ${table}`;
        if (conditions) sql += ` WHERE ${conditions}`;
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        
        return await this.query(sql, params);
    }

    // Obtener todos los registros activos (para tablas con soft delete)
    async findAllActive(table, orderBy = '') {
        return await this.findAll(table, 'activo = TRUE', [], orderBy);
    }

    // CRUD genérico - Obtener por ID
    async findById(table, id, idField = 'id') {
        const sql = `SELECT * FROM ${table} WHERE ${idField} = ?`;
        const resultado = await this.query(sql, [id]);
        return resultado[0];
    }

    // CRUD genérico - Actualizar
    async update(table, id, data, idField = 'id') {
        const campos = Object.keys(data);
        const valores = Object.values(data);
        const setClause = campos.map(campo => `${campo} = ?`).join(', ');
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`;
        return await this.query(sql, [...valores, id]);
    }

    // CRUD genérico - Eliminar
    async delete(table, id, idField = 'id') {
        const sql = `DELETE FROM ${table} WHERE ${idField} = ?`;
        return await this.query(sql, [id]);
    }

    // Soft delete genérico
    async softDelete(table, id, idField = 'id') {
        const sql = `UPDATE ${table} SET activo = FALSE WHERE ${idField} = ?`;
        return await this.query(sql, [id]);
    }

    // Verificar existencia genérica
    async exists(table, id, idField = 'id') {
        const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${idField} = ?`;
        const resultado = await this.query(sql, [id]);
        return resultado[0].count > 0;
    }

    // Contar registros relacionados
    async countRelated(table, foreignKey, id) {
        const sql = `SELECT COUNT(*) as total FROM ${table} WHERE ${foreignKey} = ?`;
        const resultado = await this.query(sql, [id]);
        return resultado[0].total;
    }

    // Join genérico para consultas complejas
    async findWithJoin(mainTable, joins = [], conditions = '', params = [], orderBy = '') {
        let sql = `SELECT * FROM ${mainTable}`;
        
        joins.forEach(join => {
            sql += ` ${join.type || 'LEFT'} JOIN ${join.table} ON ${join.condition}`;
        });
        
        if (conditions) sql += ` WHERE ${conditions}`;
        if (orderBy) sql += ` ORDER BY ${orderBy}`;
        
        return await this.query(sql, params);
    }
}

export default BaseModel;
