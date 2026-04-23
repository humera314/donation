import React from 'react';
import { Route, Switch } from "react-router-dom";
import './App.css';
import { ConnectedRouter } from 'connected-react-router'
import { history } from "./helpers/rootStore"
import { ProductList } from "./features/products/productList"
import { CampaignPage } from "./features/campaigns/CampaignPage"
import axios from "axios"

function App() {
  axios.defaults.baseURL = process.env.REACT_APP_API_BASE;

  return (
    <div className="App">
      <ConnectedRouter history={history} >
        <Switch>
          <Route path="/campaigns/:id" render={({ match }) => (
            <CampaignPage campaignId={Number(match.params.id)} />
          )} />
          <Route path="/">
            <ProductList />
          </Route>
        </Switch>
      </ConnectedRouter>
    </div>
  );
}

export default App;
