import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

// --- DATA STRUCTURES --- //
interface Ingredient {
    id: string;
    name: string;
    quantity: number;
    unit: string;
}

interface Recipe {
    id: number;
    name: string;
    category: string;
    instructions: string;
    servings: number; // Base servings
    ingredients: Ingredient[];
}

// --- HELPER FUNCTIONS --- //
const getInitialRecipes = (): Recipe[] => {
    try {
        const savedRecipes = localStorage.getItem('recipes');
        if (!savedRecipes) return [];
        const parsed = JSON.parse(savedRecipes);
        // Basic validation to check for the new data structure
        if (Array.isArray(parsed) && (parsed.length === 0 || (parsed[0].ingredients && typeof parsed[0].servings === 'number'))) {
            return parsed;
        }
        // If data is in the old format or invalid, clear it.
        localStorage.removeItem('recipes');
        return [];
    } catch (error) {
        console.error("Could not parse recipes from localStorage", error);
        return [];
    }
};

// --- COMPONENTS --- //

const RecipeList = ({ recipes, onSelectRecipe, onAddNew }: { recipes: Recipe[], onSelectRecipe: (id: number) => void, onAddNew: () => void }) => {
    const groupedRecipes = recipes.reduce<Record<string, Recipe[]>>((acc, recipe) => {
        const categoryKey = recipe.category || 'Unkategorisiert';
        if (!acc[categoryKey]) acc[categoryKey] = [];
        acc[categoryKey].push(recipe);
        return acc;
    }, {});

    return (
        <>
            <header className="page-header">
                <h1>Mein Kochbuch</h1>
                <button className="btn btn-primary" onClick={onAddNew}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
                    <span>Neues Rezept</span>
                </button>
            </header>
            <main>
                {recipes.length === 0 ? (
                    <div className="empty-state">
                        <h2>Willkommen!</h2>
                        <p>Fügen Sie Ihr erstes Rezept hinzu, um loszulegen.</p>
                        <button className="btn btn-primary" onClick={onAddNew}>Rezept erstellen</button>
                    </div>
                ) : (
                    Object.entries(groupedRecipes)
                        .sort(([catA], [catB]) => catA.localeCompare(catB))
                        .map(([category, recipesInCategory]) => (
                            <section key={category} className="category-section">
                                <h2 className="category-header">{category}</h2>
                                <div className="recipe-grid">
                                    {recipesInCategory.map(recipe => (
                                        <article key={recipe.id} className="recipe-card" onClick={() => onSelectRecipe(recipe.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelectRecipe(recipe.id)}>
                                            <h3>{recipe.name}</h3>
                                            <p>{recipe.ingredients.length} Zutaten | {recipe.servings} Portionen</p>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))
                )}
            </main>
        </>
    );
};

const RecipeDetail = ({ recipe, onDelete, onBack }: { recipe: Recipe, onDelete: (id: number) => void, onBack: () => void }) => {
    const [displayServings, setDisplayServings] = useState(recipe.servings);

    const calculateQuantity = (baseQuantity: number) => {
        if (!recipe.servings || recipe.servings <= 0) return baseQuantity;
        const ratio = displayServings / recipe.servings;
        const newQuantity = baseQuantity * ratio;
        return Number.isInteger(newQuantity) ? newQuantity : parseFloat(newQuantity.toFixed(2));
    };
    
    return (
        <div className="recipe-detail-view">
            <header className="detail-header">
                <button onClick={onBack} className="btn btn-secondary">&larr; Zurück zur Übersicht</button>
                <button onClick={() => { if (confirm(`Möchten Sie das Rezept "${recipe.name}" wirklich löschen?`)) onDelete(recipe.id) }} className="btn btn-danger">Löschen</button>
            </header>
            <main>
                <h1>{recipe.name}</h1>
                <p className="category-badge">{recipe.category}</p>

                <section className="detail-section ingredients-section">
                    <div className="section-header">
                        <h2>Zutaten</h2>
                        <div className="servings-control">
                            <label htmlFor="servings">Portionen:</label>
                            <input type="number" id="servings" min="1" value={displayServings} onChange={e => setDisplayServings(Math.max(1, Number(e.target.value)))} />
                        </div>
                    </div>
                    <ul className="ingredient-list">
                        {recipe.ingredients.map(ing => (
                            <li key={ing.id}>
                                <span className="quantity">{calculateQuantity(ing.quantity)} {ing.unit}</span>
                                <span className="name">{ing.name}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="detail-section">
                    <h2>Anleitung</h2>
                    <p className="instructions">{recipe.instructions}</p>
                </section>
            </main>
        </div>
    );
};

const RecipeForm = ({ onSave, onCancel }: { onSave: (recipe: Recipe) => void, onCancel: () => void }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [instructions, setInstructions] = useState('');
    const [servings, setServings] = useState(4);
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: `ing-${Date.now()}`, name: '', quantity: 0, unit: '' }]);

    const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
        const newIngredients = [...ingredients];
        (newIngredients[index] as any)[field] = field === 'quantity' ? Math.max(0, parseFloat(value as string)) : value;
        setIngredients(newIngredients);
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { id: `ing-${Date.now()}`, name: '', quantity: 0, unit: '' }]);
    };
    
    const removeIngredient = (index: number) => {
        if (ingredients.length > 1) {
            setIngredients(ingredients.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name || !category || !instructions || servings <= 0) {
            alert("Bitte füllen Sie alle Rezeptdetails aus.");
            return;
        }
        const validIngredients = ingredients.filter(ing => ing.name && ing.quantity > 0);
        if (validIngredients.length === 0) {
            alert("Bitte fügen Sie mindestens eine gültige Zutat hinzu (Name und Menge > 0).");
            return;
        }
        
        const newRecipe: Recipe = {
            id: Date.now(),
            name,
            category,
            instructions,
            servings: Math.max(1, servings),
            ingredients: validIngredients,
        };
        onSave(newRecipe);
    };

    return (
        <div className="recipe-form-view">
            <header className="form-header">
                <h1>Neues Rezept erstellen</h1>
            </header>
            <form onSubmit={handleSubmit} className="recipe-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="name">Rezeptname</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="z.B. Spaghetti Carbonara" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="category">Kategorie</label>
                        <input id="category" type="text" value={category} onChange={e => setCategory(e.target.value)} required placeholder="z.B. Italienisch" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="servings">Portionen (Basis)</label>
                        <input id="servings" type="number" min="1" value={servings} onChange={e => setServings(Number(e.target.value))} required />
                    </div>
                </div>
                
                <div className="form-group">
                    <label>Zutaten</label>
                    <div className="ingredient-inputs">
                        {ingredients.map((ing, index) => (
                            <div key={ing.id} className="ingredient-row">
                                <input type="number" placeholder="Menge" value={ing.quantity || ''} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} className="input-quantity" min="0" step="any"/>
                                <input type="text" placeholder="Einheit" value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value)} className="input-unit" />
                                <input type="text" placeholder="Zutat" value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} className="input-name" required/>
                                <button type="button" onClick={() => removeIngredient(index)} className="btn btn-danger btn-icon" aria-label="Zutat entfernen" disabled={ingredients.length <= 1}>&times;</button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addIngredient} className="btn btn-secondary btn-add-ingredient">Zutat hinzufügen</button>
                </div>

                <div className="form-group">
                    <label htmlFor="instructions">Anleitung</label>
                    <textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} required placeholder="Schritt-für-Schritt-Anleitung..." />
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn btn-secondary">Abbrechen</button>
                    <button type="submit" className="btn btn-primary">Rezept speichern</button>
                </div>
            </form>
        </div>
    );
};

// --- MAIN APP (Controller) --- //
const App = () => {
    const [recipes, setRecipes] = useState<Recipe[]>(getInitialRecipes);
    const [currentView, setCurrentView] = useState<'list' | 'detail' | 'form'>('list');
    const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

    useEffect(() => {
        localStorage.setItem('recipes', JSON.stringify(recipes));
    }, [recipes]);
    
    const handleSaveRecipe = (recipe: Recipe) => {
        setRecipes(prev => [...prev.filter(r => r.id !== recipe.id), recipe]);
        setCurrentView('list');
    };

    const handleDeleteRecipe = (id: number) => {
        setRecipes(recipes.filter(recipe => recipe.id !== id));
        setCurrentView('list');
        setSelectedRecipeId(null);
    };

    const handleSelectRecipe = (id: number) => {
        setSelectedRecipeId(id);
        setCurrentView('detail');
    };

    const renderView = () => {
        switch (currentView) {
            case 'form':
                return <RecipeForm onSave={handleSaveRecipe} onCancel={() => setCurrentView('list')} />;
            case 'detail':
                const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
                if (!selectedRecipe) {
                    setCurrentView('list');
                    return null;
                }
                return <RecipeDetail recipe={selectedRecipe} onDelete={handleDeleteRecipe} onBack={() => setCurrentView('list')} />;
            case 'list':
            default:
                return <RecipeList recipes={recipes} onSelectRecipe={handleSelectRecipe} onAddNew={() => setCurrentView('form')} />;
        }
    };

    return (
        <div className="container">
            {renderView()}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}