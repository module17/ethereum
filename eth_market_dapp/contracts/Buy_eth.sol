pragma solidity ^0.4.4;

import "./Orders.sol";

contract Buy_eth {
    Orders orders;
    uint weiToBuy;
    uint price; //wei per smallest currency unit (eg. cent)   
    address buyer;
    mapping(address => uint) sales;
    uint8 pending;
    modifier onlyBuyer() {require(msg.sender == buyer);  _;}
    
    event LogNewWeiToBuy(uint wei_to_buy);
    event LogNewPrice(uint nprice);
    event LogSalePending(address indexed _buyer, address indexed _seller, uint value, uint _price);
    event LogCashReceived(address indexed _seller, address indexed _buyer);

    function Buy_eth(uint _price, address _buyer, address _orders) public payable {
        orders = Orders(_orders);
        buyer = _buyer;
        price = _price;
        pending = 0;
        weiToBuy = msg.value;
    }
    function sell() public payable {
        require(sales[msg.sender] == 0);
        require(msg.value > 0 && msg.value/2 < weiToBuy && (msg.value/2/price)%5000 == 0); 
        uint amt = msg.value/2;
        LogSalePending(buyer, msg.sender, amt, price);
        sales[msg.sender] = amt;
        weiToBuy -= amt;
        pending += 1;
        LogNewWeiToBuy(weiToBuy);
    }

    function confirmReceived() public payable {
        require(sales[msg.sender] > 0 && pending > 0);
        uint amt = sales[msg.sender];
        sales[msg.sender] = 0;
        msg.sender.transfer(amt);
        LogCashReceived(msg.sender, buyer);
        weiToBuy += 2*amt;
        pending -= 1;
        LogNewWeiToBuy(weiToBuy);
    }
    
    function retreive_eth(uint vol) public onlyBuyer payable {  
        require(vol < weiToBuy-price*5000);
        weiToBuy -= vol;
        buyer.transfer(vol);
        LogNewWeiToBuy(weiToBuy);
    }

    function changePrice(uint new_price) public onlyBuyer {
        price = new_price;
        LogNewPrice(price);
    }

    function terminate_contract() public onlyBuyer payable {
        require(pending == 0);
        orders.removeBuyOrder();
        selfdestruct(buyer);
    }

    function get_vars() view public returns(uint,uint) {
        return (weiToBuy, price);
    }

    function is_party() view public returns(string) {
        if (buyer == msg.sender) return "buyer";
        else if (sales[msg.sender] > 0) return "seller";
    }

    function has_pending() view public returns(bool) {
	if (pending > 0) return true;
    }
}
