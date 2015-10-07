// object that defines the flow of an order's status state.
// null means status can't be changed
var status_to_next_status = {
    unassigned: "assigned",
    assigned: "accepted",
    accepted: "enroute",
    enroute: "servicing",
    servicing: "complete",
    complete: null,
    cancelled: null
};

// object that defines the input.value of the input.advance-status
var status_to_input_value = {
    accepted: "Start Route",
    enroute: "Begin Servicing",
    servicing: "Complete Order"
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

$("#generate-stats-csv").click(function(){
    $.ajax({
        type: "GET",
        url: $("#config").data("base-url") +
            $("#config").data("uri-segment") +
            "generate-stats-csv",
        contentType: 'application/json',
        success: function(response) {
            if (response.success === true) {

		// remove download link
		$("#download-stats-csv").remove();

		alert("stats.csv generation initiated." +
		      " Please refresh the page in a minute or so," +
		      " then try to download the CSV file..");
            }
        }
    });
});

$("#download-stats-csv").click(function(){
    window.location = $("#config").data("base-url") +
        $("#config").data("uri-segment") +
        "download-stats-csv";
});

$(document).ready(function(){

    $('.show-all').click(function(){
        var table = $("#" + $(this).data('show-id'));
        if (table.hasClass('showing-all')) {
            table.removeClass('showing-all');
            $(this).html('[show all]');
        } else {
            table.addClass('showing-all');
            $(this).html('[hide after 7]');
        }
    });

    $('#send-push-to-active-users').click(function(){
        var message = prompt("Push notification message to send to all active users:");
        if (!message || message == null || message == "") {
            return false;
        }
        if (confirm("!!! Are you sure you want to send this message to all active users?: " + message)) {
            $.ajax({
                type: "POST",
                url: $("#config").data("base-url") + "dashboard/send-push-to-all-active-users",
                data: JSON.stringify(
                    {
                        "message": message
                    }
                ),
                dataType: "json",
                contentType: 'application/json',
                success: function(response) {
                    alert('Sent!');
                },
                failure: function(response) {
                    alert('Something went wrong. Push notifications may or may not have been sent. Wait until sure before trying again.');
                }
            });
        }
    });

    $('#send-push-to-selected-users').click(function(){
        var users = new Array();
        $('.send-push-to:checked').each(function(){
            users.push($(this).val());
        });

        if (users.length === 0) {
            alert('No users selected.');
            return false;
        }

        var message = prompt("Push notification message to send to selected users (" + users.length + "):");
        if (!message || message == null || message == "") {
            return false;
        }
        
        if (confirm("!!! Are you sure you want to send this message to all selected users?: " + message)) {
            $.ajax({
                type: "POST",
                url: $("#config").data("base-url") + "dashboard/send-push-to-users-list",
                data: JSON.stringify({
                    "message": message,
                    "user-ids": users
                }),
                dataType: "json",
                contentType: 'application/json',
                success: function(response) {
                    alert('Sent!');
                    $('.send-push-to:checked').attr('checked', false);
                },
                failure: function(response) {
                    alert('Something went wrong. Push notifications may or may not have been sent. Wait until sure before trying again.');
                    $('.send-push-to:checked').attr('checked', false);
                }
            });
        }
    });

    $('.cancel-order').click(function(){
        if (confirm("Are you sure you want to cancel this order? (this cannot be undone) (customer will be notified via push notification)")) {
            // to get the element inside of success statement
            var self = this;
            $(self).attr("disabled", true);
            $.ajax({
                type: "POST",
                url: "dashboard/cancel-order",
                data: JSON.stringify({
                    "order_id": $(this).data("id"),
                    "user_id": $(this).data("user-id")
                }),
                dataType: "json",
                contentType: 'application/json',
                success: function(response) {
                    $(self).removeAttr("disabled");
                    if (!response.success) {
                        alert('The order could not be cancelled!\n' +
                              'Server Message: ' +
                              response.message);
                    } else {
                        // remove the cancel order button and mark the
                        // order has cancelled
                        alert('Order cancelled!');
                        location.reload();
                    }
                },
                failure: function(response) {
                    $(self).removeAttr("disabled");
                    alert('Something went wrong. Order has NOT ' +
                          'been cancelled!');
                    console.log(response);
                }
            });
        }
    });
    $('td.status').on("click", ".advance-status", function(){
        var current_status = $(this).parent().text();
        console.log(current_status);
        if (confirm("Are you sure you want to mark this order as " +
                    capitalizeFirstLetter(status_to_next_status[current_status]) +
                    "? (this" +
                    " cannot be undone) (customer will " +
                    "be notified via push notification)")) {
            // to get the element inside of success statement
            var self = this;
            // used to cache the input.advance-status
            // element below
            var cache;
            $.ajax({
                type: "POST",
                url: "dashboard/update-status",
                data: JSON.stringify({
                    "order_id": $(this).data("order-id"),
                }),
                dataType: "json",
                contentType: 'application/json',
                success: function(response) {
                    if (!response.success) {
                        alert('The order could not be advanced!\n' +
                              'Server Message: '
                              + response.message);
                    } else {
                        // grab the input.advance-status element..
                        cache = $(self);
                        // ..and modify it's value to relfect the
                        // status that it would be updated to
                        if (status_to_input_value[status_to_next_status[current_status]])
                        {
                            // the new input value is non-null
                            cache.val(status_to_input_value[status_to_next_status[current_status]]);
                        }

                        // when an order is marked as complete
                        // the page should be refreshed so that
                        // the Busy? column of the courier table
                        // is updated
                        if (response.message === "complete") {
                            alert("The order has been marked as " +
                                  "Complete. Refreshing page.");
                            location.reload();
                        }
                        else {
                            // update the order's status
                            $(self).parent().text(response.message).append(cache);
                        }
                    }
                },
                failure: function(response) {
                    alert('Something went wrong. Order was NOT ' +
                          'advanced!');
                    console.log(response);
                }
            });
        }
    });

    $('select.assign-courier').change(function(){
        var courier_id = $(this).val();
        var input_button = $(this).parent().find("input.assign-courier");
        if (courier_id != "Assign to Courier") {
            input_button.attr("disabled",false);
        } else {
            input_button.attr("disabled",true);
        }
    });

    $('input.assign-courier').click(function(){
        var selected_courier = $(this).parent().find("select option:selected").text();
        if (confirm("Are you sure you want to assign this order to " +
                    selected_courier +
                    "? (this cannot be undone) " +
                    " (courier will be notified via push notification)")) {
            // to get the element inside of success statement
            var self = this;
            $(this).attr("disabled",true);
            $.ajax({
                type: "POST",
                url: "dashboard/assign-order",
                data: JSON.stringify({
                    "order_id": $(this).data("order-id"),
                    "courier_id": $(this).parent().find("select").val()
                }),
                dataType: "json",
                contentType: 'application/json',
                success: function(response) {
                    if (!response.success) {
                        alert('The order could not be assigned!\n' +
                              'Server Message: ' +
                              response.message);
                        $(self).attr("disabled",false);
                    } else {
                        // send alert
                        alert("This order has been assigned to "
                              + selected_courier);
                        // reload page
                        location.reload();
                    }
                },
                failure: function(response) {
                    alert('Something went wrong. Order was NOT ' +
                          'advanced!');
                    $(self).attr("disabled",false);
                    console.log(response);
                }
            });
        }
    });

    var saveButton = document.createElement("input");
    saveButton.type = "submit";
    saveButton.className = "save-zones";
    saveButton.setAttribute("value","Save");

    var editButton = document.createElement("input");
    editButton.type = "submit";
    editButton.className = "edit-zones";
    editButton.setAttribute("value","Edit");

    // listener for edit
    $('#zones').on('click', 'input.edit-zones',function(){
        // get all zone text input fields and activate them
        var textInputFields = $("table#zones").find('input:text');
        textInputFields.map(function(index,el)
                            {el.removeAttribute("disabled");});

        // replace the edit button with a save button
        $(this).replaceWith(saveButton);
    });

    // listener for save
    $('#zones').on('click','input.save-zones', function() {
        // replace the save button with an edit button
        $(this).replaceWith(editButton);

        // confirm that the user would like to save
        if (confirm("Are you sure you want to save your edits to the Zones?")) {
            // get the rows for each zone
            var zoneRows = $("table#zones tbody tr");
            // given a tr, create the edn map for fuel prices
            var ednFuelPrices = function(tr) {
                var price87     = $(tr).find(".87-price").find("input").val();
                var price91     = $(tr).find(".91-price").find("input").val();

                return "{:87 " + price87 + " :91 " + price91 + "}";
            };
            // given a tr, create the edn map for services fees
            var ednServiceFees = function(tr) {
                var hrFee       = $(tr).find(".1-hr-fee").find("input").val();
                var threeHrsFee = $(tr).find(".3-hr-fee").find("input").val();

                return "{:60 " + hrFee + " :180 " + threeHrsFee +"}";
            };
            // given a tr, create the edn map for service time bracket
            var ednServiceTimeBracket = function(tr) {
                var serviceStart = $(tr).find(".service-start").find("input").val();
                var serviceEnd   = $(tr).find(".service-end").find("input").val();
                return "[" + serviceStart + " " + serviceEnd + "]";
            }
            // update each zone row
            zoneRows.map(function(index,el) {
                $.ajax({
                    type: "POST",
                    url: "dashboard/update-zone",
                    data: JSON.stringify({
                        "id":  $(el).find(".87-price input").data("id"),
                        "fuel_prices": ednFuelPrices(el),
                        "service_fees": ednServiceFees(el),
                        "service_time_bracket": ednServiceTimeBracket(el)
                    }),
                    dataType: "json",
                    contentType: "application/json",
                    success: function(response) {
                        alert("The zones information has been updated!");
                    },
                    failure: function(response) {
                        alert("The zone with id number " +
                              $(el).find(".87-price input").data("id") +
                              " did not update properly.");
                        console.log(response);
                    }
                });
            });
            // get all zone text input fields and deactivate them
            var textInputFields = $("table#zones").find('input:text');
            textInputFields.map(function(index,el)
                                {el.setAttribute("disabled",true);});
        }
    });
});
