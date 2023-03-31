import Duck from "./Duck";
import { combineReducers } from "redux";
import { fork } from "redux-saga/effects";
import { parallel } from "redux-saga-catch";

export default class ComposableDuck extends Duck {
    get _disallowInheritGetters() {
        return [...super._disallowInheritGetters, "ducks"];
    }
    get _cacheGetters() {
        return [...super._cacheGetters, "ducks"];
    }
    getSubDuckOptions(route) {
        const { namespace, route: parentRoute } = this.options;
        const parentSelector = this.selector;
        return {
          namespace,
          route: parentRoute ? `${parentRoute}/${route}` : route,
          selector: state => parentSelector(state)[route]
        };
    }
    makeDucks(ducks) {
        const map = {};
        for (const route of Object.keys(ducks)) {
          let Duck = ducks[route];
          map[route] = new Duck(this.getSubDuckOptions(route));
        }
        return map;
    }
    get ducks() {
        return Object.assign(
          {},
          this.makeDucks(this.quickDucks),
          this.rawDucks
        );
    }
    get quickDucks() {
        return {};
    }
    get rawDucks() {
        return {};
    }
    get reducer() {
        const ducksReducers = {};
        for (const key of Object.keys(this.ducks)) {
            ducksReducers[key] = this.ducks[key].reducer;
        }
        return combineReducers({
            ...this.reducers,
            ...ducksReducers
        });
    }
    *ducksSaga() {
        const { ducks } = this;
        let sagas = [];
        for (const key of Object.keys(ducks)) {
          const duck = ducks[key];
          sagas = sagas.concat(duck.sagas);
        }
        yield parallel(sagas);
    }
    *saga() {
        yield* super.saga();
        yield fork([this, this.ducksSaga]);
    }
}