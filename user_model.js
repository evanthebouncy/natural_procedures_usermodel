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

// this user just emits out a long list of primitives
function manual_user(target_id) {
    let full_seq = mc_facts.get_full_construction(target_id);
    // filter out the list part, which is recipe
    let recipe_part = [];
    for (let i = 0; i < full_seq.length; i++) {
        // check if type is array
        if (Array.isArray(full_seq[i])) {
            recipe_part.push(full_seq[i]);
        }
    }
    // reverse the recipe part
    recipe_part.reverse();

    // try to construct the natural program
    let item_name = mc_facts.ingredients_dict[target_id].l_name;
    var ret_np = {
        name: "make " + item_name,
    }
    let steps = [];
    // iterate over the recipe part
    for (let i = 0; i < recipe_part.length; i++) {
        let cur_recipe = recipe_part[i];
        let unique_ingredients = new Set([...cur_recipe]);
        unique_ingredients.forEach(function(item) {
            if (item != 0) {
                let pick_cmd_name = "pick_" + item;
                let pick_cmd = pick_cmd_name; // mc_facts.primitives_dict[pick_cmd_name];
                steps.push(pick_cmd);
                for (var loc = 0; loc < cur_recipe.length; loc++) {
                    if (cur_recipe[loc] == item) {
                        let place_cmd = mc_facts.recipe_loc_to_place_cmd(loc);
                        steps.push(place_cmd);
                    }
                }
            }
        });
        steps.push("craft");
    }
    ret_np.steps = steps;
    return ret_np;
}

// a few use cases

// pick a random item from list of all items


let manual_np = manual_user(mc_facts.sample_makeable_item());
console.log(manual_np);