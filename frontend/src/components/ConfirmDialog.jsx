function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
      <div className="modal-backdrop">
        <div className="confirm-dialog">
          <p>{message}</p>
          <div className="form-buttons">
            <button type="button" onClick={onConfirm}>Yes, Delete</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  
  export default ConfirmDialog;