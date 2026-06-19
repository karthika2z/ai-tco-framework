.PHONY: setup run install clean

# One-time setup
setup:
	bash setup.sh

# Run the app (activates venv automatically)
run:
	. .venv/bin/activate && streamlit run app.py

# Install / re-install deps into existing venv
install:
	. .venv/bin/activate && pip install -r requirements.txt

# Remove virtual environment
clean:
	rm -rf .venv
	echo "Virtual environment removed. Run 'make setup' to start fresh."
