const mc_facts = require('./minecraft_facts.js');


// an example natural program

const unknown = null;


// takes in a target_id
// returns a list of primitives that makes this id
function recursive_craft(target_id, ingredients_dict) {
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
    // kinda inefficient because we are picking and placing each time, 
    // rather than picking and placing multiple times with the same item
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
    let fuzzed_name = mc_facts.fuzz_name(item_name);
    console.log("original name: " + item_name);
    var ret_np = {
        name: "make " + fuzzed_name,
    }
    let steps = recursive_craft(target_id, mc_facts.ingredients_dict);
    ret_np.steps = steps;
    return ret_np;
}


// let manual_np = manual_user(mc_facts.sample_makeable_item());
// console.log(manual_np);

// Recursive Natural Program Generation

// first some helpers

// natural language fuzzers with the NL aspect, 
// probably some of the ugliest code I've ever written

function fuzz_name_on_effort(target_id, effort_ratio){
    let item_name = mc_facts.ingredients_dict[target_id].l_name;
    let fuzzed_name = mc_facts.fuzz_name(item_name);

    // sample a coin to see if we should use the name or the fuzzed one based on effort
    var name_used = null;
    if (Math.random() < effort_ratio) {
        name_used = item_name;
    } else {
        name_used = fuzzed_name;
    }
    return name_used;
}

function fuzz_list_on_effort(list_of_words, effort_ratio) {
    let index = Math.floor(Math.random() * list_of_words.length * (1 - effort_ratio));
    return list_of_words[index];
}

function nl_make(target_id, effort_ratio) {
    let name_used = fuzz_name_on_effort(target_id, effort_ratio);
    let verb_choice = ['make', 'build', 'craft', 'construct', 'create'];
    let verb = fuzz_list_on_effort(verb_choice, effort_ratio);
    return verb + " " + name_used;
}

function nl_prereq(target_id, effort_ratio) {
    let name_used = fuzz_name_on_effort(target_id, effort_ratio);
    let verb_choice = ['get', 'gather', 'acquire', 'obtain', 'collect', 'pick up', 'grab'];
    let noun_choice = ['materials', 'ingredients', 'components', 'parts'];
    let verb = fuzz_list_on_effort(verb_choice, effort_ratio);
    let noun = fuzz_list_on_effort(noun_choice, effort_ratio);
    return verb + " " + noun + " for " + name_used;
}

function nl_craft(target_id, effort_ratio) {
    let name_used = fuzz_name_on_effort(target_id, effort_ratio);
    let verb_choice = ['craft', 'build', 'construct', 'create'];
    let suffix_choice = ['using materials', 'using ingredients', 'using components', 'using parts'];
    let verb = fuzz_list_on_effort(verb_choice, effort_ratio);
    let suffix = fuzz_list_on_effort(suffix_choice, effort_ratio);
    return verb + " " + name_used + " " + suffix;
}

function nl_pick(target_id, effort_ratio) {
    let name_used = fuzz_name_on_effort(target_id, effort_ratio);
    let verb_choice = ['pick', 'grab', 'hold', 'take', 'get'];
    let verb = fuzz_list_on_effort(verb_choice, effort_ratio);
    let fuzz_cmd_name = verb + " " + name_used;
    let exact_cmd_name = "pick_" + target_id;
    // return either fuzz name or exact name based on effort
    if (Math.random() < effort_ratio) {
        return exact_cmd_name;
    } else {
        return fuzz_cmd_name;
    }
}

function nl_place(loc, effort_ratio) {
    let place_cmd = mc_facts.recipe_loc_to_place_cmd(loc);
    let coord_i = place_cmd[6];
    let coord_j = place_cmd[8];
    let fuzz_coord_i = {
        0 : [0, 'top', 'zero'],
        1 : [1, 'mid', 'one'],
        2 : [2, 'bot', 'two'],
    }
    let fuzz_coord_j = {
        0 : [0, 'left', 'zero'],
        1 : [1, 'mid', 'one'],
        2 : [2, 'right', 'two'],
    }
    let coord_i_fuzz_choice = fuzz_coord_i[coord_i];
    let coord_j_fuzz_choice = fuzz_coord_j[coord_j];
    let coord_i_used = fuzz_list_on_effort(coord_i_fuzz_choice, effort_ratio);
    let coord_j_used = fuzz_list_on_effort(coord_j_fuzz_choice, effort_ratio);

    let verb_choice = ['place', 'set', 'put', 'place on'];
    let pronoun_choice = ['it', 'the item', 'the object'];
    let verb = fuzz_list_on_effort(verb_choice, effort_ratio);
    let pronoun = fuzz_list_on_effort(pronoun_choice, effort_ratio);
    let fuzz_cmd_name = verb + " " + pronoun + " " + coord_i_used + " " + coord_j_used;

    let exact_cmd_name = place_cmd;
    // return either fuzz name or exact name based on effort
    if (Math.random() < effort_ratio) {
        return exact_cmd_name;
    } else {
        return fuzz_cmd_name;
    }
}

// constraint with the PHI aspect

function phi_inventory(inventory_state) {
    return {
        inventory : inventory_state,
    }
}

// natural program generators

// attempt to build it in 1 shot, should eventually work but not in the beginning
function get_all_at_once(target_id, effort_ratio) {
    let nl = nl_make(target_id, effort_ratio);
    let inventory_state = {}
    inventory_state[target_id] = 1;
    let phi = phi_inventory(inventory_state);
    let steps = [unknown];
    return {
        name: nl,
        constraint: phi,
        steps: steps,
    }
}

// given a target_id, ensure its ingredients are in inventory
function get_prereq_np(target_id, effort_ratio) {
    let recipe = mc_facts.ingredients_dict[target_id].recipe;
    // get unique count ingredients from recipe as constraint
    let ingredients = {};
    for (let i = 0; i < recipe.length; i++) {
        if (recipe[i] != 0) {
            // check if recipe[i] is in the ingredients
            if (ingredients[recipe[i]] == null) {
                ingredients[recipe[i]] = 0;
            }
            ingredients[recipe[i]] += 1;
        }
    }
    let nl = nl_prereq(target_id, effort_ratio);
    let phi = phi_inventory(ingredients);

    let steps = [];

    for (let i = 0; i < recipe.length; i++) {
        if (recipe[i] != 0) {
            // attempt to satisfy this recipe all at once
            let make_np = get_all_at_once(recipe[i], effort_ratio);
            steps.push(make_np);
        }
    }

    return {
        name: nl,
        constraint: phi,
        steps: steps,
    }
}

// given a target_id, use the recipe to craft it (assumes prereqs are met)
function get_craft_np(target_id, effort_ratio) {
    let nl = nl_craft(target_id, effort_ratio);
    let inventory_state = {}
    inventory_state[target_id] = 1;
    let phi = phi_inventory(inventory_state);
    let recipe = mc_facts.ingredients_dict[target_id].recipe;
    let steps = [];

    for (let i = 0; i < recipe.length; i++) {
        if (recipe[i] != 0) {

            let pick_nl = nl_pick(recipe[i], effort_ratio);
            let pick_cmd = {
                name: pick_nl,
                steps: [unknown],
            }
            steps.push(pick_cmd);

            let place_nl = nl_place(i, effort_ratio);
            let place_cmd = {
                name: place_nl,
                steps: [unknown],
            }
            steps.push(place_cmd);
        }
    }
    steps.push("craft");
    return {
        name: nl,
        constraint: phi,
        steps: steps,
    }
}

// attempt to build it by first getting the materials, then crafting
function get_prereq_then_build(target_id, effort_ratio) {
    let nl = nl_make(target_id, effort_ratio);
    let inventory_state = {}
    inventory_state[target_id] = 1;
    let phi = phi_inventory(inventory_state);

    let gather_np = get_prereq_np(target_id, effort_ratio);
    let build_np = get_craft_np(target_id, effort_ratio);

    return {
        name: nl,
        constraint: phi,
        steps: [gather_np, build_np],
    }
}

let target_id = mc_facts.sample_makeable_item();
console.log(get_all_at_once(target_id, 0.0));
console.log(get_all_at_once(target_id, 0.5));
console.log(get_all_at_once(target_id, 1.0));
console.log(get_prereq_np(target_id, 0.0));
console.log(get_prereq_np(target_id, 0.5));
console.log(get_prereq_np(target_id, 1.0));
console.log(get_craft_np(target_id, 0.0));
console.log(get_craft_np(target_id, 0.5));
console.log(get_craft_np(target_id, 1.0));
console.log(get_prereq_then_build(target_id, 0.0));
console.log(get_prereq_then_build(target_id, 0.5));
console.log(get_prereq_then_build(target_id, 1.0));