/// <reference path="screeps.d.ts" />


interface Screep extends Creep, SuperCreep{
    job? : Job;
}

class SuperCreep {
    name: string;
    body: {

        /** One of the body parts constants. */
        type: string;

        /** The remaining amount of hit points of this body part. */
        hits: number

    }[];


    howManyParts(part:string):number {
      return this.body.filter(s => { return (s.type == part && s.hits > 0) }).length 
    }

    hasPart(part: string): boolean {
      return this.howManyParts(part) > 0
    }

    canMove(): boolean {
        return this.hasPart(MOVE);
    }

    canWork(): boolean {
        return this.hasPart(WORK);
    }

    canHeal(): boolean {
        return this.hasPart(HEAL);
    }

    canAttack(): boolean {
        return this.hasPart(ATTACK);
    }

    canShoot(): boolean {
        return this.hasPart(RANGED_ATTACK);
    }

    canClaim(): boolean {
        return this.hasPart(CLAIM);
    }

    log(...msg) {
        console.log("["+this.name+"]", ...msg)
    }
}




function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        })
    }); 
}


applyMixins(Creep, [SuperCreep])

