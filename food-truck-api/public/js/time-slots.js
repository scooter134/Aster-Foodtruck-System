/**
 * Time Slots Management - Frontend JavaScript
 */

const API_BASE_URL = '/api';
let currentTruckId = null;

$(document).ready(function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    $('#slotDate').val(today);
    $('#newSlotDate').val(today);

    loadFoodTrucks();
    bindEventHandlers();
});

function bindEventHandlers() {
    $('#slotDate').on('change', loadTimeSlots);
    $('#saveSlotBtn').on('click', addTimeSlot);
    $(document).on('click', '.toggle-slot-btn', function() {
        const slotId = $(this).data('slot-id');
        const isActive = $(this).data('active');
        toggleSlotStatus(slotId, !isActive);
    });
    $(document).on('click', '.delete-slot-btn', function() {
        const slotId = $(this).data('slot-id');
        if (confirm('Delete this time slot?')) deleteTimeSlot(slotId);
    });
}

function loadFoodTrucks() {
    $.ajax({
        url: API_BASE_URL + '/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                currentTruckId = response.data[0].food_truck_id;
                loadTimeSlots();
            }
        }
    });
}

function loadTimeSlots() {
    const date = $('#slotDate').val();
    $.ajax({
        url: API_BASE_URL + '/time-slots?food_truck_id=' + currentTruckId + '&slot_date=' + date,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                renderTimeSlots(response.data || []);
            }
        },
        error: function() {
            $('#timeSlotsGrid').html('<div class="col-12 text-center py-5 text-danger">Failed to load time slots</div>');
        }
    });
}

function renderTimeSlots(slots) {
    if (!slots || slots.length === 0) {
        $('#timeSlotsGrid').html('<div class="col-12 text-center py-5"><div class="empty-state"><i class="bi bi-clock"></i><h5>No time slots for this date</h5><p>Add time slots to allow customers to place orders</p></div></div>');
        return;
    }

    let html = '';
    slots.forEach(function(slot) {
        const utilization = slot.max_orders > 0 ? Math.round((slot.current_orders / slot.max_orders) * 100) : 0;
        const progressClass = utilization >= 90 ? 'bg-danger' : utilization >= 70 ? 'bg-warning' : 'bg-success';

        html += '<div class="col-md-4 col-lg-3 mb-4">' +
            '<div class="card h-100 time-slot-card ' + (!slot.is_active ? 'inactive' : '') + '">' +
            '<div class="card-body">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
            '<h5 class="mb-0">' + slot.start_time + ' - ' + slot.end_time + '</h5>' +
            '<span class="badge ' + (slot.is_active ? 'bg-success' : 'bg-secondary') + '">' + (slot.is_active ? 'Active' : 'Inactive') + '</span>' +
            '</div>' +
            '<div class="mb-2"><small class="text-muted">Orders: ' + slot.current_orders + ' / ' + slot.max_orders + '</small></div>' +
            '<div class="progress mb-3" style="height: 8px;">' +
            '<div class="progress-bar ' + progressClass + '" style="width: ' + utilization + '%"></div>' +
            '</div>' +
            '</div>' +
            '<div class="card-footer bg-white">' +
            '<div class="btn-group w-100">' +
            '<button class="btn btn-sm ' + (slot.is_active ? 'btn-outline-warning' : 'btn-outline-success') + ' toggle-slot-btn" data-slot-id="' + slot.time_slot_id + '" data-active="' + slot.is_active + '">' +
            (slot.is_active ? 'Disable' : 'Enable') + '</button>' +
            '<button class="btn btn-sm btn-outline-danger delete-slot-btn" data-slot-id="' + slot.time_slot_id + '"><i class="bi bi-trash"></i></button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    });

    $('#timeSlotsGrid').html(html);
}

function addTimeSlot() {
    const data = {
        food_truck_id: currentTruckId,
        slot_date: $('#newSlotDate').val(),
        start_time: $('#newSlotStart').val(),
        end_time: $('#newSlotEnd').val(),
        max_orders: parseInt($('#newSlotMaxOrders').val())
    };

    $.ajax({
        url: API_BASE_URL + '/time-slots',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Time slot added');
                bootstrap.Modal.getInstance(document.getElementById('addSlotModal')).hide();
                $('#slotDate').val(data.slot_date);
                loadTimeSlots();
            }
        },
        error: function(xhr) {
            showToast('Error', xhr.responseJSON?.error || 'Failed to add slot', 'danger');
        }
    });
}

function toggleSlotStatus(slotId, isActive) {
    $.ajax({
        url: API_BASE_URL + '/time-slots/' + slotId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ is_active: isActive }),
        success: function() {
            showToast('Success', isActive ? 'Slot enabled' : 'Slot disabled');
            loadTimeSlots();
        },
        error: function() {
            showToast('Error', 'Failed to update slot', 'danger');
        }
    });
}

function deleteTimeSlot(slotId) {
    $.ajax({
        url: API_BASE_URL + '/time-slots/' + slotId,
        method: 'DELETE',
        success: function() {
            showToast('Success', 'Time slot deleted');
            loadTimeSlots();
        },
        error: function() {
            showToast('Error', 'Failed to delete slot', 'danger');
        }
    });
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    toast.show();
}
