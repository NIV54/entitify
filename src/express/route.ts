import { Router } from "express";
import { EntityTarget, getConnection, getRepository } from "typeorm";

import { getWhereConditions } from "../utils/conditions";
import { getFieldsByType } from "../utils/decode-entity/get-fields-by-type";

import { getQueryString } from "./getQueryString";

export interface Options {
  take?: number;
}

const defaultOptions: Options = { take: 50 };

export const route = <TEntity extends EntityTarget<{ id: number }>>(
  entityClass: TEntity,
  options: Options = defaultOptions
) => {
  options = { ...defaultOptions, ...options };

  const { name: entityName, ownColumns } = getConnection().getMetadata(entityClass);
  const repository = getRepository(entityClass);

  const stringFields = getFieldsByType(ownColumns, "String");
  const numberFields = getFieldsByType(ownColumns, "Number");
  const booleanFields = getFieldsByType(ownColumns, "Boolean");

  const router = Router();

  router.get("/count", async (_req, res) => {
    try {
      const count = await repository.count({});
      res.status(200).json({ count });
    } catch (error) {
      throw error;
    }
  });

  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const entity = await repository.findOneOrFail(id);
      res.status(200).json(entity);
    } catch (err) {
      const error = new Error(`No ${entityName} found with id: ${id}`);
      error.stack = err.stack + "/n" + error.stack;
      throw error;
    }
  });

  router.get("/", async (req, res) => {
    try {
      const {
        take = options.take,
        skip = 0,
        paginate = true,
        _and = false
      } = getQueryString(req.url);

      const conditions: any = {
        where: getWhereConditions({
          query: req.query,
          stringFields,
          numberFields,
          booleanFields,
          and: _and as boolean
        }),
        order: { id: "ASC" }
      };

      if (paginate) {
        conditions.take = take;
        conditions.skip = skip;
      }

      const [entities, total] = await repository.findAndCount(conditions);
      res.status(200).json({ entities, total });
    } catch (error) {
      throw error;
    }
  });

  router.post("/", async (req, res) => {
    try {
      const entity = repository.create(req.body.entity);
      const entityFromDB = await repository.save(entity);
      res.status(200).json({ entity: entityFromDB });
    } catch (error) {
      throw error;
    }
  });

  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      let entity = await repository.findOneOrFail(id);
      entity = {
        ...entity,
        ...req.body.entity
      };
      const entityFromDB = await repository.save(entity);
      res.status(200).json({ entity: entityFromDB });
    } catch (err) {
      const error = new Error(`No ${entityName} found with id: ${id}`);
      error.stack = err.stack + "/n" + error.stack;
      throw error;
    }
  });

  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await repository.delete(id);
      res.sendStatus(200);
    } catch (err) {
      const error = new Error(`No ${entityName} found with id: ${id}`);
      error.stack = err.stack + "/n" + error.stack;
      throw error;
    }
  });

  return router;
};