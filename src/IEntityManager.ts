import {IEntity} from "@src/IEntity";
import {Filter, FilterFunc, IEntityQuery} from "@src/IEntityQuery";

export interface IEntityManager {
    set(entity: IEntity, data: Record<string, any>): void;
    unset(entity: IEntity, data: Record<string, any>): void;
    query<T extends IEntity>(filter: FilterFunc|string[]): IEntityQuery<T>;
    filter<T extends IEntity>(filter: Filter, callback:(entities:Set<T>)=>void):void;
    child(name?:string, owner?: IEntity, existingEntity?:any): IEntity;
    destroy(entity: IEntity): void;
    lookup(id:number):IEntity|null;
    getRoot():IEntity;
    apply():void;
}
