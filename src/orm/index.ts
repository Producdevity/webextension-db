// ORM Layer - SQL-like operations that work across SQLite and JSON providers
import { IDatabase } from '../types/index.js'

// ORM Types
export interface ColumnDefinition {
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'JSON'
  primaryKey?: boolean
  unique?: boolean
  notNull?: boolean
  defaultValue?: any
  autoIncrement?: boolean
}

export interface TableSchema {
  [columnName: string]: ColumnDefinition
}

export interface WhereCondition {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN'
  value: any
}

export interface OrderBy {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface QueryOptions {
  where?: WhereCondition[]
  orderBy?: OrderBy[]
  limit?: number
  offset?: number
}

export interface InsertData {
  [column: string]: any
}

export interface UpdateData {
  [column: string]: any
}

// ORM Query Builder
export class QueryBuilder {
  private db: IDatabase
  private tableName: string
  private schema: TableSchema

  constructor(db: IDatabase, tableName: string, schema: TableSchema) {
    this.db = db
    this.tableName = tableName
    this.schema = schema
  }

  // SELECT operations
  async findAll(options: QueryOptions = {}): Promise<any[]> {
    if (this.db.provider === 'sqlite') {
      return this.findAllSQL(options)
    } else {
      return this.findAllJSON(options)
    }
  }

  async findOne(options: QueryOptions = {}): Promise<any | null> {
    const results = await this.findAll({ ...options, limit: 1 })
    return results.length > 0 ? results[0] : null
  }

  async findById(id: any): Promise<any | null> {
    if (!this.db.query) {
      throw new Error('Database does not support SQL queries')
    }
    const primaryKey = this.getPrimaryKeyColumn()
    const sql = `SELECT * FROM ${this.tableName} WHERE ${primaryKey} = ?`
    const params = [id]
    const result = await this.db.query(sql, params)
    return result.length > 0 ? result[0] : null
  }

  // INSERT operations
  async insert(data: InsertData): Promise<any> {
    this.validateData(data)

    if (this.db.provider === 'sqlite') {
      return this.insertSQL(data)
    } else {
      return this.insertJSON(data)
    }
  }

  async insertMany(dataArray: InsertData[]): Promise<void> {
    await this.db.transaction('readwrite', async (_tx) => {
      for (const data of dataArray) {
        await this.insert(data)
      }
    })
  }

  // UPDATE operations
  async update(data: UpdateData, options: QueryOptions): Promise<number> {
    this.validateData(data, false)

    if (this.db.provider === 'sqlite') {
      return this.updateSQL(data, options)
    } else {
      return this.updateJSON(data, options)
    }
  }

  async updateById(id: any, data: UpdateData): Promise<boolean> {
    const primaryKey = this.getPrimaryKeyColumn()
    const updated = await this.update(data, {
      where: [{ column: primaryKey, operator: '=', value: id }],
    })
    return updated > 0
  }

  // DELETE operations
  async delete(options: QueryOptions): Promise<number> {
    if (this.db.provider === 'sqlite') {
      return this.deleteSQL(options)
    } else {
      return this.deleteJSON(options)
    }
  }

  async deleteById(id: any): Promise<boolean> {
    const primaryKey = this.getPrimaryKeyColumn()
    const deleted = await this.delete({
      where: [{ column: primaryKey, operator: '=', value: id }],
    })
    return deleted > 0
  }

  // COUNT operations
  async count(options: QueryOptions = {}): Promise<number> {
    if (this.db.provider === 'sqlite') {
      return this.countSQL(options)
    } else {
      return this.countJSON(options)
    }
  }

  // SQLite implementations
  private async findAllSQL(options: QueryOptions): Promise<any[]> {
    if (!this.db.query) {
      throw new Error('Database does not support SQL queries')
    }
    const { sql, params } = this.buildSelectSQL(options)
    return this.db.query(sql, params)
  }

  private async insertSQL(data: InsertData): Promise<any> {
    if (!this.db.exec) {
      throw new Error('Database does not support SQL execution')
    }
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = values.map(() => '?').join(', ')

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    await this.db.exec(sql, values)

    // Return the inserted data with generated ID if applicable
    const primaryKey = this.getPrimaryKeyColumn()
    if (this.schema[primaryKey]?.autoIncrement && !data[primaryKey]) {
      if (!this.db.query) {
        throw new Error('Database does not support SQL queries')
      }
      const lastIdResult = await this.db.query(
        'SELECT last_insert_rowid() as id',
      )
      return { ...data, [primaryKey]: lastIdResult[0].id }
    }

    return data
  }

  private async updateSQL(
    data: UpdateData,
    options: QueryOptions,
  ): Promise<number> {
    if (!this.db.exec) {
      throw new Error('Database does not support SQL execution')
    }
    const setClause = Object.keys(data)
      .map((col) => `${col} = ?`)
      .join(', ')
    const { whereClause, params: whereParams } = this.buildWhereClause(
      options.where || [],
    )

    const sql = `UPDATE ${this.tableName} SET ${setClause}${whereClause}`
    const params = [...Object.values(data), ...whereParams]

    await this.db.exec(sql, params)

    // SQLite doesn't return affected rows easily, so we'll estimate
    return this.countSQL({ where: options.where || [] })
  }

  private async deleteSQL(options: QueryOptions): Promise<number> {
    if (!this.db.exec) {
      throw new Error('Database does not support SQL execution')
    }
    const { whereClause, params } = this.buildWhereClause(options.where || [])
    const countBefore = await this.countSQL({ where: options.where || [] })

    const sql = `DELETE FROM ${this.tableName}${whereClause}`
    await this.db.exec(sql, params)

    return countBefore
  }

  private async countSQL(options: QueryOptions): Promise<number> {
    if (!this.db.query) {
      throw new Error('Database does not support SQL queries')
    }
    const { whereClause, params } = this.buildWhereClause(options.where || [])
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause}`
    const result = await this.db.query(sql, params)
    return result[0].count
  }

  // JSON implementations (for Safari fallback)
  private async findAllJSON(options: QueryOptions): Promise<any[]> {
    // Get all records from the table
    const allRecords = await this.getAllRecordsJSON()
    let results = Object.values(allRecords)

    // Apply WHERE conditions
    if (options.where && options.where.length > 0) {
      results = results.filter((record) =>
        this.matchesWhereConditions(record, options.where!),
      )
    }

    // Apply ORDER BY
    if (options.orderBy && options.orderBy.length > 0) {
      results.sort((a, b) => this.compareRecords(a, b, options.orderBy!))
    }

    // Apply LIMIT and OFFSET
    if (options.offset) {
      results = results.slice(options.offset)
    }
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  private async insertJSON(data: InsertData): Promise<any> {
    const primaryKey = this.getPrimaryKeyColumn()
    let id = data[primaryKey]

    // Generate ID if auto-increment
    if (this.schema[primaryKey]?.autoIncrement && !id) {
      id = await this.generateNextIdJSON()
      data = { ...data, [primaryKey]: id }
    }

    // Store the record
    await this.db.set(this.tableName, String(id), data)
    return data
  }

  private async updateJSON(
    data: UpdateData,
    options: QueryOptions,
  ): Promise<number> {
    const allRecords = await this.getAllRecordsJSON()
    let updatedCount = 0

    for (const [key, record] of Object.entries(allRecords)) {
      if (this.matchesWhereConditions(record, options.where || [])) {
        const updatedRecord = { ...record, ...data }
        await this.db.set(this.tableName, key, updatedRecord)
        updatedCount++
      }
    }

    return updatedCount
  }

  private async deleteJSON(options: QueryOptions): Promise<number> {
    const allRecords = await this.getAllRecordsJSON()
    let deletedCount = 0

    for (const [key, record] of Object.entries(allRecords)) {
      if (this.matchesWhereConditions(record, options.where || [])) {
        await this.db.delete(this.tableName, key)
        deletedCount++
      }
    }

    return deletedCount
  }

  private async countJSON(options: QueryOptions): Promise<number> {
    const results = await this.findAllJSON(options)
    return results.length
  }

  // Helper methods
  private buildSelectSQL(options: QueryOptions): {
    sql: string
    params: any[]
  } {
    let sql = `SELECT * FROM ${this.tableName}`
    const params: any[] = []

    const { whereClause, params: whereParams } = this.buildWhereClause(
      options.where || [],
    )
    sql += whereClause
    params.push(...whereParams)

    if (options.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map(
        (order) => `${order.column} ${order.direction}`,
      )
      sql += ` ORDER BY ${orderClauses.join(', ')}`
    }

    if (options.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    if (options.offset) {
      sql += ` OFFSET ${options.offset}`
    }

    return { sql, params }
  }

  private buildWhereClause(conditions: WhereCondition[]): {
    whereClause: string
    params: any[]
  } {
    if (conditions.length === 0) {
      return { whereClause: '', params: [] }
    }

    const clauses: string[] = []
    const params: any[] = []

    for (const condition of conditions) {
      if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
        const placeholders = condition.value.map(() => '?').join(', ')
        clauses.push(
          `${condition.column} ${condition.operator} (${placeholders})`,
        )
        params.push(...condition.value)
      } else {
        clauses.push(`${condition.column} ${condition.operator} ?`)
        params.push(condition.value)
      }
    }

    return {
      whereClause: ` WHERE ${clauses.join(' AND ')}`,
      params,
    }
  }

  private async getAllRecordsJSON(): Promise<{ [key: string]: any }> {
    // This is a simplified approach - in a real implementation,
    // we might want to use a more efficient storage pattern
    const records: { [key: string]: any } = {}

    // For now, we'll use a simple approach where we store an index
    try {
      const indexKey = `${this.tableName}_index`
      const index =
        ((await this.db.get('_indexes', indexKey)) as string[]) || []

      for (const key of index) {
        const record = await this.db.get(this.tableName, key)
        if (record) {
          records[key] = record
        }
      }
    } catch (error) {
      // If no index exists, return empty
    }

    return records
  }

  private async generateNextIdJSON(): Promise<number> {
    const counterKey = `${this.tableName}_counter`
    const currentCounter =
      ((await this.db.get('_counters', counterKey)) as number) || 0
    const nextId = currentCounter + 1
    await this.db.set('_counters', counterKey, nextId)
    return nextId
  }

  private matchesWhereConditions(
    record: any,
    conditions: WhereCondition[],
  ): boolean {
    return conditions.every((condition) => {
      const recordValue = record[condition.column]
      const conditionValue = condition.value

      switch (condition.operator) {
        case '=':
          return recordValue === conditionValue
        case '!=':
          return recordValue !== conditionValue
        case '>':
          return recordValue > conditionValue
        case '<':
          return recordValue < conditionValue
        case '>=':
          return recordValue >= conditionValue
        case '<=':
          return recordValue <= conditionValue
        case 'LIKE':
          return String(recordValue).includes(
            String(conditionValue).replace('%', ''),
          )
        case 'IN':
          return (
            Array.isArray(conditionValue) &&
            conditionValue.includes(recordValue)
          )
        case 'NOT IN':
          return (
            Array.isArray(conditionValue) &&
            !conditionValue.includes(recordValue)
          )
        default:
          return false
      }
    })
  }

  private compareRecords(a: any, b: any, orderBy: OrderBy[]): number {
    for (const order of orderBy) {
      const aVal = a[order.column]
      const bVal = b[order.column]

      let comparison = 0
      if (aVal < bVal) comparison = -1
      else if (aVal > bVal) comparison = 1

      if (comparison !== 0) {
        return order.direction === 'DESC' ? -comparison : comparison
      }
    }
    return 0
  }

  private getPrimaryKeyColumn(): string {
    for (const [column, definition] of Object.entries(this.schema)) {
      if (definition.primaryKey) {
        return column
      }
    }
    return 'id' // Default fallback
  }

  private validateData(
    data: InsertData | UpdateData,
    _isInsert: boolean = true,
  ): void {
    const columnNames = Object.keys(this.schema)

    // Check for unknown columns
    for (const column of Object.keys(data)) {
      if (!columnNames.includes(column)) {
        throw new Error(
          `Column '${column}' does not exist in table '${this.tableName}'`,
        )
      }
    }

    // Check for required columns
    for (const [column, definition] of Object.entries(this.schema)) {
      const columnDef = definition
      if (!columnDef) {
        continue
      }
      const value = data[column]
      if (columnDef.notNull && (value === null || value === undefined)) {
        throw new Error(`Column '${column}' cannot be null`)
      }
    }
  }
}

// Table class for easier ORM usage
export class Table {
  private db: IDatabase
  private tableName: string
  private schema: TableSchema
  private queryBuilder: QueryBuilder

  constructor(db: IDatabase, tableName: string, schema: TableSchema) {
    this.db = db
    this.tableName = tableName
    this.schema = schema
    this.queryBuilder = new QueryBuilder(db, tableName, schema)
  }

  async createTable(): Promise<void> {
    if (this.db.provider === 'sqlite') {
      await this.createTableSQL()
    }
    // JSON provider doesn't need explicit table creation
  }

  private async createTableSQL(): Promise<void> {
    if (!this.db.exec) {
      throw new Error('Database does not support SQL execution')
    }
    const columns = Object.entries(this.schema).map(([name, def]) => {
      let columnDef = `${name} ${def.type}`

      if (def.primaryKey) columnDef += ' PRIMARY KEY'
      if (def.autoIncrement) columnDef += ' AUTOINCREMENT'
      if (def.notNull) columnDef += ' NOT NULL'
      if (def.unique) columnDef += ' UNIQUE'
      if (def.defaultValue !== undefined) {
        columnDef += ` DEFAULT ${typeof def.defaultValue === 'string' ? `'${def.defaultValue}'` : def.defaultValue}`
      }

      return columnDef
    })

    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columns.join(', ')})`
    await this.db.exec(sql)
  }

  // Delegate all query methods to QueryBuilder
  findAll(options?: QueryOptions) {
    return this.queryBuilder.findAll(options)
  }
  findOne(options?: QueryOptions) {
    return this.queryBuilder.findOne(options)
  }
  findById(id: any) {
    return this.queryBuilder.findById(id)
  }
  insert(data: InsertData) {
    return this.queryBuilder.insert(data)
  }
  insertMany(dataArray: InsertData[]) {
    return this.queryBuilder.insertMany(dataArray)
  }
  update(data: UpdateData, options: QueryOptions) {
    return this.queryBuilder.update(data, options)
  }
  updateById(id: any, data: UpdateData) {
    return this.queryBuilder.updateById(id, data)
  }
  delete(options: QueryOptions) {
    return this.queryBuilder.delete(options)
  }
  deleteById(id: any) {
    return this.queryBuilder.deleteById(id)
  }
  count(options?: QueryOptions) {
    return this.queryBuilder.count(options)
  }
}

// ORM Database wrapper
export class ORM {
  private db: IDatabase
  private tables: Map<string, Table> = new Map()

  constructor(db: IDatabase) {
    this.db = db
  }

  defineTable(name: string, schema: TableSchema): Table {
    const table = new Table(this.db, name, schema)
    this.tables.set(name, table)
    return table
  }

  getTable(name: string): Table {
    const table = this.tables.get(name)
    if (!table) {
      throw new Error(`Table '${name}' is not defined`)
    }
    return table
  }

  async createTables(): Promise<void> {
    for (const table of this.tables.values()) {
      await table.createTable()
    }
  }

  // Direct database access for advanced operations
  get database(): IDatabase {
    return this.db
  }
}
