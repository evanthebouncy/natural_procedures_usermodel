const mc_facts = require('./minecraft_facts.js');


// an example natural program

const unknown = null;

class Constraint {
    constructor(object, location) {
        this.object = object;
        this.location = location;
    }
}

let np1 = {
    is_primitive: false,
    name: "make shovel",
    constraint: new Constraint("shovel", "inventory"),
    steps: [
        unknown,
        {  is_primitive: false,
           constraint : new Constraint("stick", "inventory"),
           steps: [unknown, unknown],
        },
        {is_primitive: true, name: "craft", steps:[]},
    ]
}

// takes in a target_id
// returns a list of primitives that makes this id
function recursive_craft(target_id, ingredients_dict) {
    console.log(target_id);
    console.log(ingredients_dict[target_id]);
    let recipe = ingredients_dict[target_id].recipe;
    // if there's nothing to decompose, simply return no action
    if (recipe == null) {
        return [];
    }
    var steps = [];
    // satisfy dependency on sub parts
    for (let i = 0; i < recipe.length; i++) {
        if (recipe[i] != 0) {
            let component_steps = recursive_craft(recipe[i], ingredients_dict);
            steps = steps.concat(component_steps);
        }
    }
    // use the recipe to craft the target in a series of pick and place
    for (let i = 0; i < recipe.length; i++) {
        if (recipe[i] != 0) {
            let pick_cmd = "pick_" + recipe[i];
            steps.push(pick_cmd);
            let place_cmd = mc_facts.recipe_loc_to_place_cmd(i);
            steps.push(place_cmd);
        }
    }
    steps.push("craft");
    return steps;
}

// this user just emits out a long list of primitives
function manual_user(target_id) {
    let item_name = mc_facts.ingredients_dict[target_id].l_name;
    var ret_np = {
        name: "make " + item_name,
    }
    let steps = recursive_craft(target_id, mc_facts.ingredients_dict);
    ret_np.steps = steps;
    return ret_np;
}

// a few use cases

// pick a random item from list of all items


let manual_np = manual_user(mc_facts.sample_makeable_item());
console.log(manual_np);