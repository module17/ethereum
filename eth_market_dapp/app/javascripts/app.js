// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

// Import our contract artifacts and turn them into usable abstractions.
import selleth_artifacts from '../../build/contracts/Sell_eth.json';
import buyeth_artifacts from '../../build/contracts/Buy_eth.json';
import orders_artifacts from '../../build/contracts/Orders.json';

// Sell_eth is our usable abstraction, which we'll use through the code below.
var Sell_eth = contract(selleth_artifacts);
var Buy_eth = contract(buyeth_artifacts);
var Orders = contract(orders_artifacts);
//var orders;

window.App = {

  start: function() {
    var self = this;
    // Bootstrap the Buy_eth, Sell_eth and Orders abstraction for use.
    Sell_eth.setProvider(web3.currentProvider);
    Buy_eth.setProvider(web3.currentProvider);
    Orders.setProvider(web3.currentProvider);
    // retreive Buy and Sell order values from contracts
    Orders.deployed().then(function(instance) {
      instance.getSellOrders.call().then(function(addresses) {
        if (addresses.length != 0) {
          for (var i=0; i<addresses.length; i++) {
            var addr = addresses[i];
            Sell_eth.at(addr).then(function(inst) {
              inst.get_values.call().then(function(res) {
                var volume = res[0];
                var price = res[1];
                //populate sell order contract table
                self.populate_row_cells("sell_orders", inst.address, price, volume);
                self.catchSellEvents(inst.address);
              });
            });
          };
        };
      });
      instance.getBuyOrders.call().then(function(addresses) {
        if (addresses.length != 0) {
          for (var i=0; i<addresses.length; i++) {
            var addr = addresses[i];
            Buy_eth.at(addr).then(function(inst) {
              inst.get_values.call().then(function(res) {
                var volume = res[1];
                var price = res[0];
                //populate buy order table
                self.populate_row_cells("buy_orders", inst.address, price, volume);
                self.catchBuyEvents(inst.address);
              });
            });
          };
        };
      });
    });
//    self.sortTable("sell_orders");
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  //catch events for sell orders and update order values
  catchSellEvents: function(addr) {
    self = this;
    Sell_eth.at(addr).then(function(instance) {
      var contr = document.getElementById(addr).getElementsByTagName("td");
      instance.allEvents(function(err, result) {
        if (err == null) {
          switch (result.event) {
            case "newWeiForSale":
              var price = parseFloat(contr[0].innerHTML);
              var volume = result.args.wei_for_sale/1e18;
              contr[1].innerHTML = volume.toFixed(8);
              contr[2].innerHTML = (volume*price).toFixed(2);
              break;
            case "newPrice":
              var volume = parseFloat(contr[1].innerHTML);
              var price = 1e16/result.args.nprice;
              contr[0].innerHTML = price.toFixed(2);
              contr[2].innerHTML = (volume*price).toFixed(2);
              break;
            case "purchasePending":
              self.setStatus("purchase by: " + result.args._buyer + ", a volume of: " + result.args.value + ", at price of: " + result.args.price);
              break;
            case "cashReceived":
              self.setStatus("cash received from: " + result.args.rec_buyer + ", ether sent to buyer");
          };
        };
      });
    });
  },
    //catch events for buy order
  catchBuyEvents: function(addr) {
    self = this;
    Buy_eth.at(addr).then(function(instance) {
      var contr = document.getElementById(addr).getElementsByTagName("td");
      instance.allEvents(function(err, result) {
        if (err == null) {
          switch (result.event) {
            case "newWeiToBuy":
              var price = parseFloat(contr[0].innerHTML);
              var volume = result.args.wei_to_buy/1e18;
              contr[1].innerHTML = volume.toFixed(8);
              contr[2].innerHTML = (volume*price).toFixed(2);
              break;
            case "newPrice":
              var volume = parseFloat(contr[1].innerHTML);
              var price = 1e16/result.args.nprice;
              contr[0].innerHTML = price.toFixed(2);
              contr[2].innerHTML = (volume*price).toFixed(2);
              break;
            case "purchasePending":
              self.setStatus("sale by: " + result.args._seller + ", a volume of: " + result.args.value/2 + ", at price of: " + result.args.price);
              break;
            case "cashReceived":
              self.setStatus("cash received from: " + result.args.rec_seller + ", ether sent to buyer");
          };
        };
      });
    });
  },

  //create and populate row of contract info
  populate_row_cells: function(_orders, _addr, _price, _volume) {
    self = this;
    var contract = document.createElement("tr");
    contract.innerHTML = '<td align="right"></td><td align="right"></td><td align="right"></td>';
    contract.id = _addr;
    var contr = contract.getElementsByTagName("td");
    contr[0].innerHTML = (1e16/_price).toFixed(2);
    contr[1].innerHTML = (_volume/1e18).toFixed(8);
    contr[2].innerHTML = (_volume/_price/100).toFixed(2);
    document.getElementById(_orders).append(contract);
    contract.addEventListener("click", function () {
      document.getElementById("rec_address").value = '';
      document.getElementById("nprice").value = '';
      document.getElementById("add_ether").value = '';
      if (_orders == "sell_orders") {
        document.getElementById("selected_sell_address").value = contract.id;
        document.getElementById("selectSellAddr").className = 'show';
        document.getElementById("new_sell_contract").className = 'hidden';
        // see if user is seller
        Sell_eth.at(_addr).then(function(inst) {
          inst.get_seller.call().then(function(res) {console.log(res);
            if (res == web3.eth.accounts[0]) {document.getElementById("contract_functions").className = 'show'
            } else {document.getElementById("buy_ether").className = 'show'}
          });
        });
      } else if (_orders == "buy_orders") {
        document.getElementById("selected_buy_address").value = contract.id;
        document.getElementById("selectBuyAddr").className = 'show';
        document.getElementById("new_buy_contract").className = 'hidden';
        // see if user is buyer
        Buy_eth.at(_addr).then(function(inst) {
          inst.get_buyer.call().then(function(res) {console.log(res);
            if (res == web3.eth.accounts[0]) {document.getElementById("contract_functions").className = 'show'}
            else {document.getElementById("sell_ether").className = 'show'}
          });
        });
      }
      var selected = document.getElementsByClassName('selected');
      if (selected[0]) selected[0].className = '';
      contract.className = 'selected';
    });
  },

  sortTable: function(_table) {
    var table, rows, switching, i, x, y, shouldSwitch;
    table = document.getElementById(_table);
    switching = true;
    while (switching) {
      switching = false;
      rows = table.getElementsByTagName("tr");
      /*Loop through all table rows (except the
      first, which contains table headers):*/
      for (i = 0; i < rows.length; i++) { 
        shouldSwitch = false;
        /*Get the two elements you want to compare,
        one from current row and one from the next:*/
        x = rows[i].getElementsByTagName("td")[0];
        y = rows[i + 1].getElementsByTagName("td")[0];
        //check if the two rows should switch place:
        if (x.innerHTML.toNumber() > y.innerHTML.toNumber()) {
          //if so, mark as a switch and break the loop:
          shouldSwitch= true;
          break;
        }
      }
      if (shouldSwitch) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      };
    };
  },

  //Add a new sell order in the form of an individual contract
  setup_sell: function() {
    var self = this;
    var price = 1e16/document.getElementById("ask_price").value;
    var volume = document.getElementById("ask_value").value*100*price;
    var addr;
    Orders.deployed().then(function(inst) {
      inst.newSellOrder(price, {from: web3.eth.accounts[0], value: 2*volume, gas: 1200000}).then(function(res) {
          self.setStatus("sell order contract deployed");
          addr = res.receipt.logs[0].address;
          self.populate_row_cells("sell_orders", addr, price, volume);
      });
    });
  },

  //buy from the selected contract
  buy: function() {
    var self = this;
   var address = document.getElementById("selected_sell_address").value;
    var contr = Sell_eth.at(address);
    var price = parseInt(1e16/document.getElementById(address).getElementsByTagName("td")[0].innerHTML);
    var volume = document.getElementById("sell_val").value*100*price;
    contr.purchase({from: web3.eth.accounts[0], value: volume, gas: 900000}).then(function(er, result) {
      if (!er)  self.setStatus("success! ");
      self.catchSellEvents(address);
    });
  },

  //Add a new buy order in the form of an individual contract
  setup_buy: function() {
    var self = this;
    var price = 1e16/document.getElementById("bid_price").value;
    var volume = document.getElementById("bid_value").value*100*price;
    var addr;
    Orders.deployed().then(function(inst) {
      inst.newBuyOrder(price, {from: web3.eth.accounts[0], value: volume, gas: 1200000}).then(function(res) {
          self.setStatus("buy order contract deployed");
          addr = res.receipt.logs[0].address;
          self.populate_row_cells("buy_orders", addr, price, volume);
      });
    });
  },

  //sell to the selected contract
  sell: function() {
    var self = this;
    var address = document.getElementById("selected_buy_address").value;
    var contr = Buy_eth.at(address);
    var price = parseInt(1e16/document.getElementById(address).getElementsByTagName("td")[0].innerHTML);
    var volume = document.getElementById("buy_val").value*100*price;
    contr.sell({from: web3.eth.accounts[0], value: 2*volume, gas: 900000}).then(function(er, res) {
      if (!er) self.setStatus("success! ");
      self.catchBuyEvents(address);
    });
  },

  payment_received: function(order) {
    self = this;
    var rec_address = document.getElementById("rec_address").value;
    var address = document.getElementById("selected_buy_address").value;
    var contr = order.at(address);
    contr.confirmReceived(rec_address, {from: web3.eth.accounts[0]}).then(function(result) {
      self.setStatus("purchase + deposit sent to " + rec_address);
    });
  },

  change_price: function(order) {
    var address = document.getElementById("selected_buy_address").value;
    var contr = order.at(address);
    var nprice = parseInt(1e16/document.getElementById("nprice").value);
    contr.changePrice(nprice, {from: web3.eth.accounts[0]}).then(function() {
      self.setStatus("contract at address: " + address + " has changed price to: " + 1e16/nprice);
    });
  },  

  add_ether: function(order) {
    var self = this;
    var address = document.getElementById("selected_address").value; 
    var contr = order.at(address);
    var volume = document.getElementById("add_ether").value;
    contr.addEther({from: web3.eth.accounts[0], value: web3.toWei(volume, "ether")}).then(function() {
     self.setStatus(volume + " ether added to contract at " + address);
    });
  },

  terminate_contract: function(order) {
    var self = this;
    var addr = document.getElementById("selected_address").value;
    order.at(addr).then(function(instance) {
      instance.retr_funds({from: web3.eth.accounts[0]}).then(function(res) {
          self.setStatus("contract terminated, funds returned.");
          var contract = document.getElementById(instance.address);
          contract.parentNode.removeChild(contract);
          Orders.deployed().then(function(inst) {
            inst.removeSellOrder(contract.id, {from:web3.eth.accounts[0]}).then(function(result) {
              if (!err) console.log("success! contract removed");
            });
          });
      });
    });
  },
},

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your web3.eth.accounts[0]s don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }
  web3.version.getNetwork((err, netId) => {
    switch (netId) {
      case "1":
        console.log('This is mainnet')
        break
      case "2":
        console.log('This is the deprecated Morden test network.')
        break
      case "3":
        console.log('This is the ropsten test network.')
        break
      default:
        console.log('This is an unknown network.')
    }
  })
  /*web3.eth.web3.eth.accounts[0]s(function(err, accs) {
    if (err != null) {alert("There was an error fetching your web3.eth.accounts[0]s."); return;}
    if (accs.length == 0) {alert("Couldn't get any web3.eth.accounts[0]s!"); return;}
    web3.eth.accounts[0]s = accs;
    web3.eth.accounts[0] = accounts[0];
  });*/
  App.start();
});
