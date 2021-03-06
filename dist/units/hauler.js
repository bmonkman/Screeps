// Haul from a mine back to base
var directions = [FIND_EXIT_RIGHT, FIND_EXIT_RIGHT, FIND_EXIT_RIGHT, FIND_EXIT_RIGHT ];
var haulersPerMiner = 2;

module.exports = {

    bodyParts: [
        [CARRY, MOVE],
        [CARRY, CARRY, MOVE],
        [CARRY, CARRY, CARRY, MOVE],
        [CARRY, CARRY, CARRY, MOVE],
        [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    ],

    run: function (creep) {
        var sources = creep.room.find(FIND_SOURCES);

        if (creep.memory.state == undefined) creep.memory.state = 'headingToMine';

        var energyInRange = creep.pos.findInRange(FIND_DROPPED_ENERGY, 3);

        if (creep.memory.state == 'findNewRoom') {
            //console.log(creep.name + " findnewroom");
            // Pick a direction
            var direction = directions[(Math.ceil(creep.memory.roleId / haulersPerMiner) - sources.length - 1)];
            var exit = creep.pos.findClosest(direction);
            if (!creep.spawning && exit == undefined) console.log(creep.name + " can't find exit " + direction);
            else creep.moveMeTo(exit, {reusePath:20});

            if (creep.room.name != creep.memory.homeRoom) creep.memory.state = 'headingToMine';
        }

        // head to the mine, keep an eye out for nearby energy
        if (creep.memory.state == 'headingToMine') {
            //console.log(creep.name + " headingToMine");

            if (creep.memory.roleId > sources.length * haulersPerMiner && creep.room.name == creep.memory.homeRoom && creep.memory.homeRoom == 'E6N8') creep.memory.state = 'findNewRoom';

            var source = sources[(creep.memory.roleId % sources.length)];
            // If there's nearby energy, gather it
            if (creep.hasCarryCapacity() && energyInRange.length > 0 && (creep.pos.getRangeTo(creep.getNearestSpawn()) > 4 || (creep.getNearestSpawn() != undefined && creep.getNearestSpawn().energy < creep.getNearestSpawn().energyCapacity))) creep.memory.state = 'gathering';
            else if (!creep.hasCarryCapacity()) creep.memory.state = 'returning';
            else if (creep.pos.getRangeTo(source) <= 2) creep.memory.state = 'gathering';
            else creep.moveMeTo(source);
        }

        // Stand next to the miner and pick up dropped energy
        if (creep.memory.state == 'gathering') {
            //console.log(creep.name + " gathering");
            // Stand next to the energy, not on it, to not block a miner
            if (creep.pos.getRangeTo(energyInRange[0]) > 1)
                creep.moveMeTo(energyInRange[0]);
            var pickup = creep.pickup(energyInRange[0]);
            if (pickup != OK) creep.memory.state = 'headingToMine';
            if (!creep.hasCarryCapacity()) creep.memory.state = 'returning';
        }

        // Return from the mine when full, drop off at extensions, spawns, or drop on the ground
        if (creep.memory.state == 'returning') {
            //console.log(creep.name + " returning");

            // If there's no spawn in the room, return all the way home
            if (creep.room.name != creep.memory.homeRoom && creep.getNearestSpawn() == undefined) {
                //console.log(creep.name + " returning to home room");
                var exitDir = creep.room.findExitTo(creep.memory.homeRoom);
                var exit = creep.pos.findClosest(exitDir);
                creep.moveMeTo(exit);
            } else {

                // If there are nearby workers on the path, give energy away
                var closestWorkers = creep.pos.findInRange(FIND_MY_CREEPS, 2, {
                    filter: function (c) {
                        return (c.carry.energy < c.carryCapacity) && (c.memory.role == 'builder' || c.memory.role == 'builderSupplier' || c.memory.role == 'roadMaintainer' || c.memory.role == 'controllerHauler');
                    }
                });
                for (var i in closestWorkers) {
                    creep.transferEnergy(closestWorkers[i], (closestWorkers[i].carryCapacity - closestWorkers[i].carry.energy));
                    //console.log(creep.name + " donated to " + closestWorkers[i].name);
                }

                var storage = creep.getNearestStorage();

                // If there is a storage unit, use that, and assume there will be other creeps to distribute to extensions (Post controller level 4)
                if (storage != undefined) {
                    distributeToStorage(creep, storage);
                } else {
                    // If there is not a storage unit, distribute to extensions first, then spawn (Pre controller level 4)
                    distributeToExtensionsAndSpawn(creep);
                }
            }

            if (creep.carry.energy <= 0) creep.memory.state = 'headingToMine';
        }

    }
}


function distributeToStorage(creep, storage)
{
    creep.moveMeTo(storage);

    // If there is no more space, drop the energy
    if (creep.transferEnergy(storage) == ERR_FULL) {
        creep.dropEnergy();
    }
}

function distributeToExtensionsAndSpawn(creep)
{
    // Look for extensions that need filling
    var nonEmptyExtension = creep.pos.findClosest(FIND_MY_STRUCTURES, {
        filter: function(i) {
            return i.structureType == STRUCTURE_EXTENSION && (i.energy < i.energyCapacity);
        }
    });

    if (nonEmptyExtension != undefined) {
        creep.moveMeTo(nonEmptyExtension);
        creep.transferEnergy(nonEmptyExtension);
    } else {
        creep.moveMeTo(creep.getSpawn());

        // If there is no more space, drop the energy
        if (creep.pos.getRangeTo(creep.getSpawn()) == 1 && creep.transferEnergy(creep.getSpawn()) == ERR_FULL) {
            creep.dropEnergy();
        }
    }

}
