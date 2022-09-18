import {IEntity} from "@src/IEntity";
import {EntityQuery} from "@src/EntityQuery";

export interface IArchetype {
    id: string,
    tags: Set<string>;
    entities: Set<IEntity>;
    addEdges: Record<string, IArchetype>;
    removeEdges: Record<string, IArchetype>;
    queries: Set<EntityQuery<IEntity>>;
}
