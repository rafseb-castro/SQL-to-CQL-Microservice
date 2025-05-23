// src/pages/ConfigurePermissionsPage.tsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layouts/AdminLayout';
import PermissionsService from '../services/PermissionsService';
import ChangeRoleService from '../services/ChangeRoleService';
import '../styles/ConfigurePermissions.css';

interface Permission {
  id: string;
  name: string;
  active: boolean;
}

const ConfigurePermissionsPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [rol, setRol] = useState('Usuario Común');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [permissionsChanged, setPermissionsChanged] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previousSearch, setPreviousSearch] = useState('');
  const [originalRol, setOriginalRol] = useState('Usuario Común');

  // Lista de permisos con los IDs exactos que espera el backend
  const [permissions, setPermissions] = useState<Permission[]>([
    { id: 'ALTER KEYSPACE', name: 'Alter Keyspace', active: false },
    { id: 'ALTER TABLE ADD', name: 'Alter Table Add', active: false },
    { id: 'ALTER TABLE DROP', name: 'Alter Table Drop', active: false },
    { id: 'ALTER TABLE RENAME', name: 'Alter Table Rename', active: false },
    { id: 'CREATE INDEX', name: 'Create Index', active: false },
    { id: 'CREATE KEYSPACE', name: 'Create Keyspace', active: false },
    { id: 'CREATE TABLE', name: 'Create Table', active: false },
    { id: 'DELETE', name: 'Delete', active: false },
    { id: 'DESCRIBE KEYSPACES', name: 'Describe Keyspaces', active: false },
    { id: 'DESCRIBE TABLE', name: 'Describe Table', active: false },
    { id: 'DESCRIBE TABLES', name: 'Describe Tables', active: false },
    { id: 'DROP INDEX', name: 'Drop Index', active: false },
    { id: 'DROP KEYSPACE', name: 'Drop Keyspace', active: false },
    { id: 'DROP TABLE', name: 'Drop Table', active: false },
    { id: 'INSERT', name: 'Insert', active: false },
    { id: 'SELECT', name: 'Select', active: false },
    { id: 'TRUNCATE TABLE', name: 'Truncate Table', active: false },
    { id: 'UPDATE', name: 'Update', active: false },
    { id: 'USE', name: 'Use', active: false }
  ]);

  useEffect(() => {
    // Detectar cambios en los permisos o en el rol
    if (originalPermissions.length > 0) {
      const hasPermissionChanges = permissions.some(perm => {
        const original = originalPermissions.find(orig => orig.id === perm.id);
        return original && original.active !== perm.active;
      });
      
      const hasRolChange = rol !== originalRol;
      
      setPermissionsChanged(hasPermissionChanges || hasRolChange);
    }
  }, [permissions, originalPermissions, rol, originalRol]);

  // Función para mapear permisos del backend al formato del frontend
  const mapPermissionsFromBackend = (operaciones: string[], operacionesDisponibles: string[]) => {
    if (!operaciones || !operacionesDisponibles) {
      console.error('Error: operaciones o operacionesDisponibles es undefined');
      return permissions;
    }
    
    console.log('Operaciones del usuario:', operaciones);
    console.log('Operaciones disponibles:', operacionesDisponibles);
    
    const mappedPermissions = permissions.map(perm => {
      const isActive = operaciones.includes(perm.id);
      return {
        ...perm,
        active: isActive
      };
    });
    
    return mappedPermissions;
  };

  // Función para buscar usuario por cédula
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setErrorMessage('Por favor, ingresa una cédula para buscar');
      setErrorDialog(true);
      return;
    }

    if (permissionsChanged && searchQuery !== previousSearch) {
      setErrorMessage('Tienes cambios sin guardar. Guarda los cambios antes de buscar otro usuario.');
      setErrorDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await PermissionsService.getUserPermissions(searchQuery);
      
      console.log('Respuesta del servidor:', response);
      console.log('Rol del usuario:', response.rol);
      
      setNombre(response.nombre);
      setCedula(response.cedula);
      
      // Establecer el rol actual y original basado en el valor booleano
      const userRol = response.rol ? 'Administrador' : 'Usuario Común';
      setRol(userRol);
      setOriginalRol(userRol);
      setIsAdmin(response.rol);
      
      console.log('Rol establecido:', userRol);
      console.log('Es admin:', response.rol);
      
      const defaultPermissions = permissions.map(perm => ({ ...perm, active: false }));
      setPermissions(defaultPermissions);
      
      const mappedPermissions = mapPermissionsFromBackend(
        response.operaciones, 
        response.operacionesDisponibles
      );
      
      setPermissions(mappedPermissions);
      setOriginalPermissions([...mappedPermissions]);
      setPermissionsChanged(false);
      setPreviousSearch(searchQuery);
    } catch (error: any) {
      console.error('Error al buscar usuario:', error);
      setErrorMessage(error.message || 'No se encontró un usuario con la cédula proporcionada');
      setErrorDialog(true);
      
      setNombre('');
      setCedula('');
      setRol('Usuario Común');
      setOriginalRol('Usuario Común');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar cambio en el rol del usuario
  const handleRolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRol = e.target.value;
    setRol(newRol);
    
    // Si cambia a administrador, activar todos los permisos
    if (newRol === 'Administrador') {
      setPermissions(permissions.map(perm => ({ ...perm, active: true })));
    }
  };

  // Manejar cambio en un permiso
  const handleTogglePermission = (id: string) => {
    setPermissions(prevPermissions =>
      prevPermissions.map(perm =>
        perm.id === id ? { ...perm, active: !perm.active } : perm
      )
    );
  };

  // Confirmar y guardar cambios
  const handleSave = () => {
    if (!cedula) {
      setErrorMessage('Primero debes buscar un usuario');
      setErrorDialog(true);
      return;
    }
    
    if (!permissionsChanged) {
      setErrorMessage('No se han realizado cambios');
      setErrorDialog(true);
      return;
    }
    
    setConfirmDialog(true);
  };

  // Enviar cambios al backend
  const handleConfirmYes = async () => {
    setConfirmDialog(false);
    setIsLoading(true);
    
    try {
      // Determinar si cambió el rol comparando con el rol original
      const currentIsAdmin = rol === 'Administrador';
      const originalIsAdmin = originalRol === 'Administrador';
      const rolChanged = currentIsAdmin !== originalIsAdmin;
      
      console.log('Rol actual:', rol, 'es admin:', currentIsAdmin);
      console.log('Rol original:', originalRol, 'era admin:', originalIsAdmin);
      console.log('¿Cambió el rol?:', rolChanged);
      
      // PASO 1: Primero actualizar los permisos
      const changedOperations = permissions
        .filter(perm => {
          const original = originalPermissions.find(orig => orig.id === perm.id);
          return !original || original.active !== perm.active;
        })
        .map(perm => ({
          name: perm.id,
          enabled: perm.active
        }));
        
      if (changedOperations.length > 0) {
        console.log('Paso 1: Enviando cambios de permisos:', changedOperations);
        await PermissionsService.updateMultiplePermissions(cedula, changedOperations);
        console.log('Permisos actualizados exitosamente');
      }
      
      // PASO 2: Después actualizar el rol si cambió
      if (rolChanged) {
        console.log('Paso 2: Actualizando rol del usuario a:', currentIsAdmin ? 'Administrador' : 'Usuario Común');
        await ChangeRoleService.updateUserRole(cedula, currentIsAdmin);
        console.log('Rol actualizado exitosamente');
      }
      
      // PASO 3: Actualizar toda la información del usuario desde el servidor
      console.log('Paso 3: Obteniendo estado actualizado del servidor');
      const updatedUser = await PermissionsService.getUserPermissions(cedula);
      
      // Actualizar el estado local con la respuesta del servidor
      const newRol = updatedUser.rol ? 'Administrador' : 'Usuario Común';
      setRol(newRol);
      setOriginalRol(newRol);
      setIsAdmin(updatedUser.rol);
      
      console.log('Estado final - Rol:', newRol, 'isAdmin:', updatedUser.rol);
      
      // Actualizar permisos
      const mappedPermissions = mapPermissionsFromBackend(
        updatedUser.operaciones, 
        updatedUser.operacionesDisponibles
      );
      
      setPermissions(mappedPermissions);
      setOriginalPermissions([...mappedPermissions]);
      setPermissionsChanged(false);
      
      // Mostrar mensaje de éxito
      setSuccessDialog(true);
    } catch (error: any) {
      console.error('Error al guardar cambios:', error);
      setErrorMessage(error.message || 'Error al guardar los cambios');
      setErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmNo = () => {
    setConfirmDialog(false);
  };

  const handleAcceptSuccess = () => {
    setSuccessDialog(false);
  };

  const handleAcceptError = () => {
    setErrorDialog(false);
  };

  // Dividir los permisos en 3 columnas
  const permissionsPerColumn = Math.ceil(permissions.length / 3);
  const leftPermissions = permissions.slice(0, permissionsPerColumn);
  const middlePermissions = permissions.slice(permissionsPerColumn, 2 * permissionsPerColumn);
  const rightPermissions = permissions.slice(2 * permissionsPerColumn);

  return (
    <AdminLayout>
      <div className="admin-panel permissions-panel">
        <div className="search-container">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por Cédula/Código"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              id="search-cedula"
              name="search-cedula"
            />
            <button
              className="search-button"
              onClick={handleSearch}
              disabled={isLoading}
            >
              <span className="search-icon">⌕</span>
            </button>
          </div>
        </div>

        <div className="user-info-row">
          <div className="user-field">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              readOnly
              className="user-input"
              id="user-nombre"
              name="user-nombre"
            />
          </div>
          <div className="user-field">
            <label>Cédula/Código</label>
            <input
              type="text"
              value={cedula}
              readOnly
              className="user-input"
              id="user-cedula"
              name="user-cedula"
            />
          </div>
          <div className="user-field">
            <label>Rol</label>
            <select
              value={rol}
              onChange={handleRolChange}
              className="user-input role-select"
              disabled={!cedula} // Solo deshabilitado si no hay usuario cargado
              id="user-rol"
              name="user-rol"
            >
              <option value="Administrador">Administrador</option>
              <option value="Usuario Común">Usuario Común</option>
            </select>
          </div>
        </div>

        <div className="permissions-grid">
          <div className="permissions-column">
            {leftPermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input
                    type="checkbox"
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                    disabled={false}
                    id={`permission-${permission.id}`}
                    name={`permission-${permission.id}`}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="permissions-column">
            {middlePermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input
                    type="checkbox"
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                    disabled={false}
                    id={`permission-${permission.id}`}
                    name={`permission-${permission.id}`}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
          
          <div className="permissions-column">
            {rightPermissions.map(permission => (
              <div key={permission.id} className="permission-row">
                <span className="permission-name">{permission.name}</span>
                <label className={`toggle-switch ${permission.active ? 'active' : 'inactive'}`}>
                  <input
                    type="checkbox"
                    checked={permission.active}
                    onChange={() => handleTogglePermission(permission.id)}
                    disabled={false}
                    id={`permission-${permission.id}`}
                    name={`permission-${permission.id}`}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="save-container">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={isLoading || !permissionsChanged}
          >
            {isLoading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Dialog de confirmación */}
      {confirmDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-content">
              <p className="dialog-message">¿Seguro desea cambiar el rol y/o permisos para este usuario?</p>
              <div className="dialog-buttons">
                <button
                  className="dialog-button confirm-button"
                  onClick={handleConfirmYes}
                  disabled={isLoading}
                >
                  SI
                </button>
                <button
                  className="dialog-button cancel-button"
                  onClick={handleConfirmNo}
                  disabled={isLoading}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de éxito */}
      {successDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-content">
              <p className="dialog-message">Se ha cambiado el rol y/o permisos del usuario</p>
              <div className="dialog-buttons">
                <button
                  className="dialog-button accept-button"
                  onClick={handleAcceptSuccess}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de error */}
      {errorDialog && (
        <div className="dialog-overlay">
          <div className="dialog-container">
            <div className="dialog-content">
              <p className="dialog-message">{errorMessage}</p>
              <div className="dialog-buttons">
                <button
                  className="dialog-button accept-button"
                  onClick={handleAcceptError}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ConfigurePermissionsPage;