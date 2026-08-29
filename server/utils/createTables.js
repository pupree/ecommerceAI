import {createUserTable} from '../models/userTable.js';
import {createShippingInfoTable} from '../models/shippinginfoTable.js';
import {createProductReviewsTable} from '../models/productReviewsTable.js';
import {createProductTable} from '../models/productTable.js';
import {createPaymentsTable} from '../models/paymentsTable.js';
import {createOrdersTable} from '../models/ordersTable.js';
import {createOrderItemsTable} from '../models/orderItemsTable.js';

export const createTables = async () => {
    try{
        await createUserTable();
        await createProductTable();
        await createProductReviewsTable();
        await createOrdersTable();
        await createOrderItemsTable();
        await createShippingInfoTable();
        await createPaymentsTable();
        console.log("All tables created successfully");
    }catch(error){
        console.error('Error creating tables:', error);
}
}
    