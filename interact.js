const user_model = require('./user_model.js');
const mc_facts = require('./minecraft_facts.js');

let interp_prob = 0.3;


// my simulated interpreter, I am rather not confident in handling the
// returning of meta-data, so this one simply returns True if np is SAT
// and False if np is not SAT
function interpreter(np) {
    let np_concrete = JSON.stringify(np);
    let n_prog_searched = 100;

    // check if the constraint talks about something that is a primitive
    // if that's the case, we always want to give SAT
    let item_in_question = np.constraint;
    // check how many keys there are in np.constaint.inventory
    let keys = Object.keys(item_in_question.inventory);
    let n_keys = keys.length;
    if (n_keys == 1) {
        // lets get that key
        let key = keys[0];
        // look up in mc_facts.ingredients_dict on key
        let item_info = mc_facts.ingredients_dict[key];
        // if it has no recipe, we know it is a primitive, return true
        if (item_info.recipe == null) {
            return true;
        }
    }

    // otherwise, we simulate the interpreter by randomly having it work or not
    let flip = Math.random() < interp_prob;
    if (flip) {
        return true;
    } else {
        return false;
    }
}

function interact(item_id) {
    let efforts_to_try = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
    // for all efforts to try to get it in 1 shot
    for (let i = 0; i < efforts_to_try.length; i++) {
        let effort_ratio = efforts_to_try[i];
        let np = user_model.get_all_at_once(item_id, effort_ratio);
        let result = interpreter(np);
        if (result == true) {
            return np;
        }
    }

    // keep track of an extended np_sofar in case we need to modify it in future
    var np_sofar = null;
    // try to do it in multiple steps
    for (let i = 0; i < efforts_to_try.length; i++) {
        let effort_ratio = efforts_to_try[i];
        let np = user_model.get_prereq_then_build(item_id, effort_ratio);
        let result = interpreter(np);
        if (result) {
            return np;
        }
        np_sofar = np;
    }

    // if we can't do it, we need to recursively build the materials
    let recipe = mc_facts.ingredients_dict[item_id].recipe;
    // track gather steps
    let gather_steps = [];

    // for thing in recipe, recursively try to interact to make them
    for (let i = 0; i < recipe.length; i++) {
        let item_id = recipe[i];
        if (item_id != 0) {
            // we trust interact will always be successful, and always return a valid np
            let np = interact(item_id);
            // this valid np will be used to build the prereq
            gather_steps.push(np);
        }
    }
    // replace the original program's gather part with the gather steps
    // which have been recursively built, and we trust they work
    // thus we trust the entire program to work
    np_sofar.steps[0].steps = gather_steps;
    return np_sofar;
}

console.log (" begin testing interaction ")
let result_np = interact(123);
console.log(result_np);
console.log(JSON.stringify(result_np));