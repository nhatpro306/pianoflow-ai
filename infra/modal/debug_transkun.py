"""One-shot diagnostic — run via: modal run infra/modal/debug_transkun.py
Inspects the transkun package structure so we know the correct Python API.
"""

import modal

app = modal.App("debug-transkun")

image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "torch", "transkun", "moduleconf", "pydub", "soxr", "numpy"
)


@app.function(image=image)
def inspect() -> dict:
    import importlib
    import inspect as _inspect

    import moduleconf
    import pkg_resources
    import transkun

    conf_path = pkg_resources.resource_filename("transkun", "pretrained/2.0.conf")
    out: dict = {}

    # conf file raw content
    try:
        with open(conf_path) as f:
            out["conf_file"] = f.read()[:1000]
    except Exception as e:
        out["conf_file_err"] = str(e)

    # what parseFromFile returns
    try:
        result = moduleconf.parseFromFile(conf_path)
        out["parseFromFile_type"] = str(type(result))
        if isinstance(result, dict):
            out["parseFromFile_keys"] = list(result.keys())
        elif isinstance(result, tuple):
            out["parseFromFile_len"] = len(result)
            out["parseFromFile_types"] = [str(type(x)) for x in result]
        else:
            out["parseFromFile_repr"] = repr(result)[:300]
    except Exception as e:
        out["parseFromFile_err"] = str(e)

    # transkun top-level
    out["transkun_init_file"] = transkun.__file__
    out["transkun_dir"] = [x for x in dir(transkun) if not x.startswith("__")]

    # ModelTransformer module - find the model class
    try:
        mt = importlib.import_module("transkun.ModelTransformer")
        out["ModelTransformer_dir"] = [x for x in dir(mt) if not x.startswith("__")]
        out["ModelTransformer_src"] = _inspect.getsource(mt)[:3000]
    except Exception as e:
        out["ModelTransformer_err"] = str(e)

    # transkun.transcribe source - see how main() builds the model
    try:
        tr = importlib.import_module("transkun.transcribe")
        out["transcribe_src"] = _inspect.getsource(tr)[:3000]
    except Exception as e:
        out["transcribe_err"] = str(e)

    return out


@app.local_entrypoint()
def main() -> None:
    import json

    result = inspect.remote()
    print(json.dumps(result, indent=2))
