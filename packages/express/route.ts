import { defaultOptions, Options } from "@entitify/common";
import { BaseEntity, getFields, getWhereConditions, parseQuery } from "@entitify/core";
import { Request, Router } from "express";
import { EntityTarget, getConnection, getRepository } from "typeorm";

import { getQueryString } from "./get-query-string";
import { EmptyObject } from "./types/empty-object.type";

export const route = <
  TEntity extends EntityTarget<BaseEntity>,
  TCreateEntity = Omit<TEntity, "id">,
  TUpdateEntity = Partial<TCreateEntity>
>(
  entityClass: TEntity,
  options: Options = {}
) => {
  options = { ...defaultOptions, ...options };

  const { name: entityName, ownColumns } = getConnection().getMetadata(entityClass);
  const fields = getFields(ownColumns);

  const router = Router();
  const repository = getRepository(entityClass);

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
      res.status(200).json({ entity });
    } catch (err) {
      const error = new Error(`No ${entityName} found with id: ${id}`);
      error.stack = (err as Error).stack + "/n" + error.stack;
      throw error;
    }
  });

  router.get("/", async (req, res) => {
    try {
      const queryString = getQueryString(req.url);

      const {
        _take = options.take,
        _skip = 0,
        paginate = options.paginate,
        _and = false,
        _sort_by = options.sortBy,
        _sort_direction = options.sortDirection
      } = parseQuery(queryString);

      const conditions: any = {
        where: getWhereConditions({
          query: req.query,
          fields,
          and: _and as boolean
        }),
        order: { [_sort_by as string]: (_sort_direction as string).toUpperCase() }
      };

      if (paginate) {
        conditions.take = _take;
        conditions.skip = _skip;
      }

      const [entities, total] = await repository.findAndCount(conditions);
      res.status(200).json({ entities, total });
    } catch (error) {
      throw error;
    }
  });

  router.post(
    "/",
    async (req: Request<EmptyObject, { entity: BaseEntity }, { entity: TCreateEntity }>, res) => {
      try {
        const entity = repository.create(req.body.entity);
        const entityFromDB = await repository.save(entity);
        res.status(200).json({ entity: entityFromDB });
      } catch (error) {
        throw error;
      }
    }
  );

  router.patch(
    "/:id",
    async (
      req: Request<{ id: number }, { entity: BaseEntity }, { entity: TUpdateEntity }>,
      res
    ) => {
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
        error.stack = (err as Error).stack + "/n" + error.stack;
        throw error;
      }
    }
  );

  router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await repository.delete(id);
      res.sendStatus(200);
    } catch (err) {
      const error = new Error(`No ${entityName} found with id: ${id}`);
      error.stack = (err as Error).stack + "/n" + error.stack;
      throw error;
    }
  });

  return router;
};
