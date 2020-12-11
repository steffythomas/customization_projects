/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/**
 
 Type of Script         --> UserEvent Script
 Type Of Module     -->SuiteBuilding
 JIRA                        --> MF-297                                                                      
 Invoice                    --> Sales Invoice
 Type of Record       -->Charge Record
 Purpose                    --> Using SuiteBilling and check the start and end dates should define the period to recurring charges
                                        Script is used to calculate the end date for each charge record from its corresponding subscription. 
                                        The end date will varying the charge frequency
                                        If the charge frequency is monthly, for eg:  start date 1/11/2020 end date should be 31/11/2020
                                        If the charge frequency is quarterly, for eg:  start date 1/11/2020 end date should be 31/1/2021
                                        If the charge frequency is annual, for eg:  start date 1/11/2020 end date should be 31/10/2021
                                        If the charge frequency is one-time, the startdate will still be the Date from the chargerecord and the end date should match the End Date on the subscription header
                                        But here we are calculating start date and end date for every month based on charge frequency
                                        In Charge Record it fetches the start date and End date value and populates in "Period Start Date" and "Period End Date" in Invoice Item Line. In subscription we are checking the End date depending upon the charge frequency
Dependency              -->ChargeRecord
                                        Invoice
                                        Subscription
Date                          -->10-12-2020
 */

define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/render', 'N/email', 'N/file', 'N/encode', 'N/task', 'N/url', 'N/redirect', 'N/runtime', 'N/format'],

    function (record, search, serverWidget, render, email, file, encode, task, url, redirect, runtime, format) {

        function calculateEndDate(context) {
            try {
                    if (context.type == 'create') {             
                        var objRec = context.newRecord
                        var id = objRec.id;
                        var objRecordNew = record.load({                                        
                            type: record.Type.CHARGE,                                            
                            id: id,                                                              
                            isDynamic: true,                                                     
                        });
                        var chargDate = objRecordNew.getValue({                                            
                            fieldId:'chargedate'                                                 
                        })
                        var subscriptionLineOnCHargeRecord = objRec.getValue({    
                            fieldId: 'subscriptionline'
                        })
                        var lineRec = record.load({
                            type: record.Type.SUBSCRIPTION_LINE,                                    
                            id: subscriptionLineOnCHargeRecord,                                    
                            isDynamic: true,                                                        
                        });
                        var lineNumber = lineRec.getValue({                                         
                            fieldId:'linenumber'                                                                    
                        })
                        var subscriptionId = lineRec.getValue({
                            fieldId: 'subscription'
                        })
                        var objRecord = record.load({                                                   
                            type: record.Type.SUBSCRIPTION,                                            
                            id: subscriptionId,                                                        
                            isDynamic: true,
                        });
                        var chargeType = objRec.getText({
                            fieldId: 'chargetype'
                        })
                        
                        if (chargeType == "One-Time") {
                            var startDate = objRecord.getValue({fieldId: 'startdate'})
                            var endDate = objRecord.getValue({fieldId: 'enddate'})
                        } 
                        else {  
                            var numLinePriceList = objRecord.getLineCount({
                                sublistId: 'priceinterval'
                            })
                            for (var j = 0; j < numLinePriceList; j++) {
                                var subscriptionlineNumber = objRecord.getSublistValue({
                                    sublistId: 'priceinterval',
                                    fieldId: 'subscriptionplanlinenumber',
                                    line: j
                                })         
                                if (lineNumber == subscriptionlineNumber) {
                                    var frequency = objRecord.getSublistText({
                                        sublistId: 'priceinterval',
                                        fieldId: 'frequency',
                                        line: j
                                    });     
                                    var repeatEvary = objRecord.getSublistText({
                                        sublistId: 'priceinterval',
                                        fieldId: 'repeatevery',
                                        line: j
                                    });
                                    break;                                        
                                }
                                if(frequency){break}
                            }
                             // Calculating If the charge frequency is monthy and update the endDate   
                            if (checkif(frequency)) {
                                if (frequency == "Monthly") {
                                    if (checkif(repeatEvary)) {
                                        var updatedDate = new Date(chargDate);
                                        log.debug('updatedDate',updatedDate)
                                                
                                        var month = Number(updatedDate.getMonth()) + Number(repeatEvary)
                                        var endDate = new Date(updatedDate.getFullYear(), month , 0)
                                    } 
                                                
                                } 
                                 // Calculating If the charge frequency is monthy      
                                else if (frequency == "Annually") {
                                    var updatedDate = new Date(chargDate);
                                    var endDate = new Date(updatedDate.getFullYear() + 1, updatedDate.getMonth(), 0)
                                }

                            } 
                            else{  
                                var endDate = objRecordNew.getValue({
                                    fieldId:'serviceenddate'
                                })
                            }
                        }
                        if(checkif(endDate)){
                            objRecordNew.setValue({
                                fieldId: 'custrecord_nap_charge_end_date',
                                value: endDate
                            })
                        }
                        objRecordNew.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });

                    }
                } 
                catch (e) {
                     log.debug("error@calculateEndDate", e)
                }
            }
            // It checks null value 
            function checkif(param) {
                try {
                    if (param == undefined || param == null || param == "" || param == " ")
                        return false;
                    else
                        return true;

                } catch (e) {
                    console.log("err@ checkif", e)
                }
            }
            var main = {
                afterSubmit: function (context) {
                        calculateEndDate(context)
                }
            }
            return main;
    });
