#!/usr/bin/env python3
"""
Script de changement de nom global : SIGUVH → TIRAHOU
"""
import os
import re
from pathlib import Path

def replace_in_file(file_path, replacements):
    """Remplacer du texte dans un fichier"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Mis à jour: {file_path}")
            return True
    except Exception as e:
        print(f"❌ Erreur {file_path}: {e}")
    return False

def main():
    """Fonction principale"""
    print("🔄 Changement de nom : SIGUVH → TIRAHOU")
    print("=" * 50)
    
    # Définir les remplacements
    replacements = {
        'SIGUVH': 'TIRAHOU',
        'siguvh': 'tirahou',
        'Siguvh': 'Tirahou',
        'siguvh.edu': 'tirahou.edu',
        'Système Intégré de Gestion d\'Université Virtuelle Hybride': 'Plateforme Intégrée de Gestion Universitaire TIRAHOU',
    }
    
    # Extensions de fichiers à traiter
    extensions = ['.py', '.md', '.txt', '.json', '.tsx', '.ts', '.js', '.html', '.css']
    
    # Dossiers à exclure
    exclude_dirs = {
        'node_modules', '.git', '__pycache__', '.venv', 'venv', 
        'staticfiles', 'media', 'logs', '.next', 'dist', 'build'
    }
    
    # Fichiers à exclure
    exclude_files = {
        'db.sqlite3', 'package-lock.json', '.DS_Store'
    }
    
    updated_files = 0
    
    # Parcourir tous les fichiers
    for root, dirs, files in os.walk('.'):
        # Exclure certains dossiers
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            # Vérifier l'extension
            if not any(file.endswith(ext) for ext in extensions):
                continue
            
            # Exclure certains fichiers
            if file in exclude_files:
                continue
            
            file_path = os.path.join(root, file)
            
            # Remplacer dans le fichier
            if replace_in_file(file_path, replacements):
                updated_files += 1
    
    print(f"\n✅ Changement terminé : {updated_files} fichiers mis à jour")
    print("\n📋 Actions supplémentaires recommandées :")
    print("1. Renommer le dossier logs/siguvh.log → logs/tirahou.log")
    print("2. Mettre à jour les variables d'environnement")
    print("3. Mettre à jour la base de données si nécessaire")
    print("4. Redémarrer les serveurs")

if __name__ == "__main__":
    main()