import { Router } from "express";
import qs from "qs";
import { EntityTarget, getConnection, getRepository, Like } from "typeorm";

export interface Options {
  take?: number;
}

const defaultOptions: Options = { take: 50 };
const fieldTypeNameIndex = 9;

export const control = <TEntity extends EntityTarget<any>>(
  entityClass: TEntity,
  options: Options = defaultOptions
) => {
  const repository = getRepository(entityClass);
  options = { ...defaultOptions, ...options };
  const { name: entityName, ownColumns } = getConnection().getMetadata(entityClass);
  const router = Router();

  const stringFields = ownColumns
    .filter(({ type }) => {
      const typeString = type.toString();
      return typeString.slice(fieldTypeNameIndex, typeString.indexOf("(")) === "String";
    })
    .map(({ propertyName }) => propertyName);

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
      //#region find conditions
      const conditions: any = {
        where: [],
        order: { id: "ASC" }
      };

      stringFields.forEach(stringField => {
        if (req.query[stringField]) {
          conditions.where.push({ [stringField]: Like("%" + req.query[stringField] + "%") });
        }
      });
      //#endregion find conditions

      //#region query string
      const queryStringIndex = req.url.indexOf("?");
      const requestHasQueryString = queryStringIndex !== -1;
      const rawQueryString = req.url.slice(requestHasQueryString ? queryStringIndex + 1 : 0);

      const queryString = qs.parse(rawQueryString, {
        decoder: value => {
          if (/^(\d+|\d*\.\d+)$/.test(value)) {
            return parseFloat(value);
          }

          let keywords = {
            true: true,
            false: false,
            null: null,
            undefined: undefined
          };
          if (value in keywords) {
            return keywords[value];
          }

          return value;
        },
        allowDots: true
      });

      const { take = options.take, skip = 0, paginate = true } = queryString;
      //#endregion query string

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
